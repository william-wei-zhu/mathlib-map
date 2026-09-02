"""Build the Theorems view: the mathematical spine of Mathlib's dependency graph.

Inputs
  cache/extract/deps.ndjson (+ .names.txt)  every constant's used constants: type (t), value (v),
                                            explicit value positions (e); integer ids
  cache/extract/mathlib.ndjson               decl / instance records (module, kind, assumptions, deprecation)
  cache/mathlib_types/*.parquet              statements and docstrings
  out/msc/modules.json                       module -> MSC area
  docs/100.yaml and the 1000+ list           famous-theorem tags

Outputs (out/atlas/)
  nodes/<2 hex>/<percent-encoded name>.json  one page per spine declaration
  search/<2 chars>.json                      prefix shards: [name, kind, citedBy]
  rank.json                                  name -> citedBy (for the other builders)
  meta.json                                  counts and the snapshot tag

The spine keeps Mathlib theorems, definitions, and inductives that are not tooling, not instances,
and not auto-generated; an edge is kept only when the target appears in the statement or in an
explicit position of the proof. Axioms and depth are propagated over the full graph, so they are
exact even though the displayed neighbors are filtered.
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import Counter, defaultdict
from pathlib import Path
from urllib.parse import quote

import numpy as np
import pandas as pd
import yaml
from scipy import sparse
from scipy.sparse.csgraph import breadth_first_order, connected_components

from .fetch import CACHE
from .mapview import load_thousand_plus

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out" / "atlas"
NON_MATH = ("Mathlib.Tactic", "Mathlib.Util", "Mathlib.Lean", "Mathlib.Testing", "Mathlib.Mathport", "Mathlib.Init")
AXIOM_ORDER = ["propext", "Classical.choice", "Quot.sound", "sorryAx"]
NEIGHBOR_CAP = 200
STAR = 30


def _yaml(p: Path):
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def shard_path(name: str) -> str:
    prefix = hashlib.sha1(name.encode()).hexdigest()[:2]
    return f"nodes/{prefix}/{quote(name, safe='')}.json"


# ------------------------------------------------------------------ loading

def load_deps():
    names = (CACHE / "extract" / "deps.ndjson.names.txt").read_text(encoding="utf-8").split("\n")
    if names and names[-1] == "":
        names.pop()
    n = len(names)
    kinds = [""] * n
    t_src, t_dst, v_src, v_dst, e_src, e_dst = [], [], [], [], [], []
    with (CACHE / "extract" / "deps.ndjson").open(encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            i = r["i"]
            kinds[i] = r["k"]
            t_src.extend([i] * len(r["t"])); t_dst.extend(r["t"])
            v_src.extend([i] * len(r["v"])); v_dst.extend(r["v"])
            e_src.extend([i] * len(r["e"])); e_dst.extend(r["e"])
    def mat(src, dst):
        return sparse.csr_matrix((np.ones(len(src), dtype=np.uint8), (np.asarray(src, dtype=np.int32), np.asarray(dst, dtype=np.int32))), shape=(n, n))
    return names, kinds, mat(t_src, t_dst), mat(v_src, v_dst), mat(e_src, e_dst)


def load_records():
    decls: dict[str, dict] = {}
    instances: set[str] = set()
    with (CACHE / "extract" / "mathlib.ndjson").open(encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            if r["kind"] == "decl":
                decls[r["name"]] = r
            elif r["kind"] == "instance":
                instances.add(r["name"])
    return decls, instances


def load_types() -> dict[str, tuple[str, str | None]]:
    out: dict[str, tuple[str, str | None]] = {}
    for p in sorted((CACHE / "mathlib_types").glob("part-*.parquet")):
        df = pd.read_parquet(p, columns=["name", "type", "docString"])
        for name, ty, doc in zip(df["name"], df["type"], df["docString"]):
            out[name] = (ty, doc if isinstance(doc, str) and doc else None)
    return out


# ------------------------------------------------------------------ graph passes

def propagate_bits(adj: sparse.csr_matrix, seed: np.ndarray, max_iter: int = 400) -> np.ndarray:
    """OR-propagate a bitmask along edges (src depends on dst) until fixpoint."""
    mask = seed.copy()
    A = adj.astype(bool).tocsr()
    for _ in range(max_iter):
        new = mask.copy()
        for bit in range(int(mask.max()).bit_length() if mask.max() else 0):
            has = (mask >> bit) & 1
            reach = A @ has.astype(np.int32)
            new |= ((reach > 0).astype(mask.dtype) << bit)
        if np.array_equal(new, mask):
            break
        mask = new
    return mask


def longest_depth(adj: sparse.csr_matrix, max_iter: int = 2000) -> np.ndarray:
    """depth(v) = 1 + max depth over dependencies; leaves 0.

    Lean's environment has reference cycles (a structure and its recursor, mutual inductives), and a
    cycle would inflate every declaration above it to the cap. So the longest path is computed on the
    condensation into strongly connected components, which is a DAG, and mapped back."""
    n_comp, label = connected_components(adj, directed=True, connection="strong")
    coo = adj.tocoo()
    src, dst = label[coo.row], label[coo.col]
    keep = src != dst
    src, dst = src[keep], dst[keep]
    depth = np.zeros(n_comp, dtype=np.int32)
    for _ in range(max_iter):
        cand = depth[dst] + 1
        new = depth.copy()
        np.maximum.at(new, src, cand)
        if np.array_equal(new, depth):
            break
        depth = new
    return depth[label]


def pagerank(adj: sparse.csr_matrix, damping: float = 0.85, iters: int = 60) -> np.ndarray:
    """PageRank where a citation flows from the citing declaration to the cited one."""
    n = adj.shape[0]
    A = adj.astype(np.float64).tocsr()
    out_deg = np.asarray(A.sum(axis=1)).ravel()
    inv = np.where(out_deg > 0, 1.0 / np.maximum(out_deg, 1), 0.0)
    M = sparse.diags(inv) @ A  # row-stochastic over citations
    r = np.full(n, 1.0 / n)
    for _ in range(iters):
        r = (1 - damping) / n + damping * (M.T @ r) + damping * (r[out_deg == 0].sum() / n)
    return r


# ------------------------------------------------------------------ build

def build(snapshot: dict | None = None) -> dict:
    names, kinds, T, V, E = load_deps()
    n = len(names)
    id_of = {nm: i for i, nm in enumerate(names)}
    decls, instances = load_records()
    types = load_types()
    cls = json.loads((ROOT / "out" / "msc" / "modules.json").read_text(encoding="utf-8"))["modules"]
    short = {str(k).zfill(2): v for k, v in (_yaml(ROOT.parent / "data" / "curated" / "msc-short-names.yaml") or {}).items()}

    # Spine membership.
    in_spine = np.zeros(n, dtype=bool)
    for nm, r in decls.items():
        i = id_of.get(nm)
        if i is None:
            continue
        mod = r.get("module") or ""
        if not mod.startswith("Mathlib.") or mod.startswith(NON_MATH):
            continue
        if r["declKind"] not in ("theorem", "definition", "inductive"):
            continue
        if nm in instances:
            continue
        if any(c.startswith("inst") and len(c) > 4 and c[4].isupper() for c in nm.split(".")):
            continue
        in_spine[i] = True
    spine_ids = np.nonzero(in_spine)[0]
    print(f"spine nodes: {len(spine_ids):,} of {n:,}", flush=True)

    # Spine edges: statement (T) or explicit proof (E), both endpoints in the spine, no self loops.
    S = sparse.diags(in_spine.astype(np.uint8))
    stmt = (S @ T @ S).tocsr(); stmt.setdiag(0); stmt.eliminate_zeros()
    proof = (S @ E @ S).tocsr(); proof.setdiag(0); proof.eliminate_zeros()
    spine = ((stmt + proof) > 0).astype(np.uint8).tocsr()
    print(f"spine edges: {spine.nnz:,} (statement {stmt.nnz:,}, explicit proof {proof.nnz:,})", flush=True)

    # Citations: only results (theorems) count as citing.
    is_thm = np.array([k == "theorem" for k in kinds])
    citing = sparse.diags(is_thm.astype(np.uint8)) @ spine
    cited_by = np.asarray(citing.sum(axis=0)).ravel().astype(np.int64)
    rank = pagerank(spine)

    # Axioms and depth over the full graph.
    full = ((T + V) > 0).astype(np.uint8).tocsr()
    seed = np.zeros(n, dtype=np.int64)
    axiom_names = [nm for i, nm in enumerate(names) if kinds[i] == "axiom"]
    other_bit = len(AXIOM_ORDER)
    for nm in axiom_names:
        i = id_of[nm]
        seed[i] = 1 << (AXIOM_ORDER.index(nm) if nm in AXIOM_ORDER else other_bit)
    print(f"axioms in environment: {len(axiom_names)}: {axiom_names[:12]}", flush=True)
    axmask = propagate_bits(full, seed)
    depth = longest_depth(full)
    print("axioms and depth done", flush=True)

    # Famous tags.
    hundred = _yaml(CACHE / "mathlib_100" / "100.yaml")
    famous: dict[str, list[str]] = defaultdict(list)
    for num, e in hundred.items():
        for d in ([e["decl"]] if e.get("decl") else list(e.get("decls") or [])):
            famous[d].append(f"#{num} of the 100 theorems: {e.get('title', '')}")
    for t in load_thousand_plus():
        for d in t["decls"]:
            famous[d].append(f"1000+ list: {t['title']}")

    # Transitive definition counts for the most cited nodes.
    is_def = np.array([k in ("definition", "inductive") for k in kinds])
    top_ids = spine_ids[np.argsort(-cited_by[spine_ids])[:3000]]
    trans_defs: dict[int, int] = {}
    for i in top_ids:
        order = breadth_first_order(full, int(i), directed=True, return_predecessors=False)
        trans_defs[int(i)] = int(is_def[order].sum())
    print("transitive counts done for", len(trans_defs), flush=True)

    def axioms_of(i: int) -> list[str]:
        m = int(axmask[i])
        out = [nm for b, nm in enumerate(AXIOM_ORDER) if m >> b & 1]
        if m >> other_bit & 1:
            out.append("other")
        return out

    def area_of(mod: str) -> dict | None:
        rec = cls.get(mod)
        if not rec or rec["primary"] in ("NONE", "UNKNOWN"):
            return None
        code = rec["primary"][:2]
        return {"code": code, "short": short.get(code, code)}

    stmt_csr, proof_csr = stmt.tocsr(), proof.tocsr()
    stmt_csc, proof_csc = stmt.tocsc(), proof.tocsc()
    spine_csr, spine_csc = spine.tocsr(), spine.tocsc()

    def neighbor(i: int, via_stmt: bool, via_proof: bool) -> dict:
        nm = names[i]
        return {"name": nm, "kind": kinds[i], "via": "both" if via_stmt and via_proof else ("statement" if via_stmt else "proof"), "citedBy": int(cited_by[i])}

    def uses_of(i: int) -> list[dict]:
        s = set(stmt_csr.indices[stmt_csr.indptr[i]:stmt_csr.indptr[i + 1]].tolist())
        p = set(proof_csr.indices[proof_csr.indptr[i]:proof_csr.indptr[i + 1]].tolist())
        ids = sorted(s | p, key=lambda j: -cited_by[j])
        return [neighbor(j, j in s, j in p) for j in ids]

    def used_by(i: int) -> list[dict]:
        s = set(stmt_csc.indices[stmt_csc.indptr[i]:stmt_csc.indptr[i + 1]].tolist())
        p = set(proof_csc.indices[proof_csc.indptr[i]:proof_csc.indptr[i + 1]].tolist())
        ids = sorted(s | p, key=lambda j: -cited_by[j])
        return [neighbor(j, j in s, j in p) for j in ids]

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "nodes").mkdir(exist_ok=True)
    (OUT / "search").mkdir(exist_ok=True)
    search: dict[str, list] = defaultdict(list)
    rank_out: dict[str, int] = {}
    written = 0
    for i in spine_ids:
        nm = names[int(i)]
        r = decls[nm]
        ty, doc = types.get(nm, ("", None))
        uses = uses_of(int(i))
        usedby = used_by(int(i))
        star = [x["name"] for x in (uses[:STAR // 2] + usedby[:STAR // 2])][:STAR]
        dep = {"to": r.get("deprecatedTo"), "since": r.get("deprecatedSince")} if r.get("deprecatedTo") or r.get("deprecatedSince") else None
        page = {
            "name": nm,
            "kind": kinds[int(i)],
            "module": r.get("module"),
            "area": area_of(r.get("module") or ""),
            "statement": ty,
            "doc": doc,
            "assumes": r.get("assumes", []),
            "deprecated": dep,
            "famous": famous.get(nm, []),
            "citedBy": int(cited_by[i]),
            "rank": float(rank[i]),
            "depth": int(depth[i]),
            "axioms": axioms_of(int(i)),
            "restsOnDefinitions": trans_defs.get(int(i)),
            "usesCount": len(uses),
            "usedByCount": len(usedby),
            "uses": uses[:NEIGHBOR_CAP],
            "usedBy": usedby[:NEIGHBOR_CAP],
            "star": star,
        }
        p = OUT / shard_path(nm)
        p.parent.mkdir(exist_ok=True)
        p.write_text(json.dumps(page, separators=(",", ":")), encoding="utf-8")
        written += 1
        rank_out[nm] = [int(cited_by[i]), kinds[int(i)]]
        keys = {c[:2].lower() for c in nm.split(".") if len(c) >= 2}
        for k in keys:
            if re.fullmatch(r"[a-z0-9_]{2}", k):
                search[k].append([nm, kinds[int(i)], int(cited_by[i])])
        if written % 50000 == 0:
            print(f"  wrote {written:,} node pages", flush=True)

    for k, entries in search.items():
        entries.sort(key=lambda x: -x[2])
        (OUT / "search" / f"{k}.json").write_text(json.dumps(entries, separators=(",", ":")), encoding="utf-8")
    (OUT / "rank.json").write_text(json.dumps(rank_out, separators=(",", ":")), encoding="utf-8")

    top = sorted(((int(cited_by[i]), names[int(i)]) for i in spine_ids), reverse=True)[:25]
    axiom_dist = Counter(tuple(axioms_of(int(i))) for i in spine_ids)
    meta = {
        "snapshot": snapshot or {},
        "constants": n,
        "spineNodes": int(len(spine_ids)),
        "spineEdges": int(spine.nnz),
        "statementEdges": int(stmt.nnz),
        "proofEdges": int(proof.nnz),
        "maxDepth": int(depth.max()),
        "topCited": top,
        "axiomProfiles": {" + ".join(k) if k else "none": v for k, v in axiom_dist.most_common(8)},
        "searchShards": len(search),
    }
    (OUT / "meta.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    return meta


if __name__ == "__main__":
    print(json.dumps(build(), indent=1))
