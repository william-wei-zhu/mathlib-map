"""Build the Structures view data from the extractor's NDJSON.

Inputs: `class`, `instance`, and `decl` records (see docs/extractor.md).
Outputs (under pipeline/out/hierarchy/):
  index.json              every class (id, family, arity, short doc, parents), every hierarchy edge,
                          and the concrete types with the most instances
  classes/<name>.json     one page worth of data per class
  families.json           family id -> label, class count

Edge kinds:
  extends    Lean's `extends` clause (from the class's parent info)
  forgetful  a user-written instance `[A α] : B α` with one source, a generic argument, not from extends
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "out" / "hierarchy"

FAMILY_RULES: list[tuple[str, str]] = [
    ("Mathlib.Algebra.", "Algebra"),
    ("Mathlib.GroupTheory.", "Algebra"),
    ("Mathlib.RingTheory.", "Algebra"),
    ("Mathlib.FieldTheory.", "Algebra"),
    ("Mathlib.LinearAlgebra.", "Algebra"),
    ("Mathlib.RepresentationTheory.", "Algebra"),
    ("Mathlib.Order.", "Order"),
    ("Mathlib.Topology.", "Topology"),
    ("Mathlib.Analysis.", "Analysis"),
    ("Mathlib.MeasureTheory.", "Analysis"),
    ("Mathlib.Probability.", "Analysis"),
    ("Mathlib.Geometry.", "Geometry"),
    ("Mathlib.CategoryTheory.", "CategoryTheory"),
    ("Mathlib.AlgebraicGeometry.", "Geometry"),
    ("Mathlib.AlgebraicTopology.", "Topology"),
    ("Mathlib.NumberTheory.", "Algebra"),
    ("Mathlib.Combinatorics.", "Combinatorics"),
    ("Mathlib.SetTheory.", "Logic"),
    ("Mathlib.ModelTheory.", "Logic"),
    ("Mathlib.Logic.", "Logic"),
    ("Mathlib.Computability.", "Logic"),
    ("Mathlib.Data.", "Data"),
    ("Mathlib.Control.", "Data"),
    ("Mathlib.Tactic.", "Meta"),
    ("Mathlib.Lean.", "Meta"),
    ("Mathlib.Util.", "Meta"),
    ("Mathlib.", "Other"),
    ("Init.", "Core"),
    ("Lean.", "Core"),
    ("Std.", "Core"),
    ("Batteries.", "Core"),
]

FAMILY_LABELS = {
    "Algebra": "Algebra",
    "Order": "Order",
    "Topology": "Topology",
    "Analysis": "Analysis",
    "Geometry": "Geometry",
    "CategoryTheory": "Category theory",
    "Combinatorics": "Combinatorics",
    "Logic": "Logic and sets",
    "Data": "Data types",
    "Core": "Lean core",
    "Meta": "Tactics and metaprogramming",
    "Other": "Other",
}

# Type constructors that transport structure (a subtype, a product, the order dual) rather than
# name a mathematical object. They satisfy hundreds of classes each, so without a demotion they
# would crowd out ℝ, ℚ, and ℤ in every list.
TRANSPORT_TYPES = {
    "Subtype", "Prod", "OrderDual", "Set.Elem", "ULift", "MulOpposite", "AddOpposite", "Lex", "Shrink",
    "WithAbs", "PUnit", "Opposite", "HasQuotient.Quotient", "Sigma", "PSigma", "Sum", "Option", "WithTop",
    "WithBot", "WithZero", "WithOne", "Additive", "Multiplicative", "Pi", "Function", "Unit", "PLift",
    "Quotient", "Quot", "Fin", "Finset", "Multiset", "List", "Array", "Subsemigroup", "Submonoid",
    "Subgroup", "Subring", "Subalgebra", "Submodule", "Ideal", "Subfield", "Subsemiring", "IntermediateField",
    "Equiv", "Trunc", "Squash", "Id", "OrderHom", "MonoidHom", "RingHom", "LinearMap", "ContinuousMap",
    "Filter", "Set", "SetLike", "Con", "AddCon", "Toplex", "Colex", "Zero", "One",
}

# Classes that are elaboration machinery rather than mathematics; kept out of the diagram
# but still available on their own pages.
HIDE_PREFIXES = ("Lean.", "Std.", "Batteries.", "Aesop.", "Mathlib.Tactic", "Qq.", "ProofWidgets.")


def family_of(module: str | None) -> str:
    if not module:
        return "Other"
    for prefix, fam in FAMILY_RULES:
        if module.startswith(prefix):
            return fam
    return "Other"


def short_doc(doc: str | None) -> str | None:
    if not doc:
        return None
    text = re.sub(r"\s+", " ", doc.strip())
    m = re.match(r"(.+?[.!?])(\s|$)", text)
    return (m.group(1) if m else text)[:280]


def read_records(path: Path):
    with path.open(encoding="utf-8") as f:
        for line in f:
            yield json.loads(line)


def build(ndjson: Path, out: Path = OUT, snapshot: dict | None = None) -> dict:
    classes: dict[str, dict] = {}
    instances: list[dict] = []
    assumes: dict[str, list[str]] = defaultdict(list)  # class -> declarations assuming it
    for rec in read_records(ndjson):
        k = rec["kind"]
        if k == "class":
            classes[rec["name"]] = rec
        elif k == "instance":
            instances.append(rec)
        elif k == "decl":
            # Only results and definitions count as "assuming" a class; constructors, recursors,
            # and structure projections are machinery.
            if rec.get("declKind") not in ("theorem", "definition"):
                continue
            last = rec["name"].rsplit(".", 1)[-1]
            if last in ("mk", "rec", "recOn", "casesOn", "noConfusion", "noConfusionType", "inj", "injEq", "sizeOf_spec", "ext", "ext_iff"):
                continue
            for c in set(rec.get("assumes", [])):
                assumes[c].append(rec["name"])

    # Edges
    extends_edges: set[tuple[str, str, str]] = set()
    for name, c in classes.items():
        for p in c.get("parents", []):
            if p["name"] in classes:
                extends_edges.add((name, p["name"], p["projFn"]))
    forgetful_edges: set[tuple[str, str, str]] = set()
    derived: dict[str, list[dict]] = defaultdict(list)   # target -> multi-source instances
    concrete: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))  # type -> class -> [inst]
    direct_instance_count: Counter[str] = Counter()
    for inst in instances:
        tgt = inst.get("target")
        if not tgt or tgt not in classes:
            continue
        direct_instance_count[tgt] += 1
        args = inst.get("args", [])
        srcs = [s for s in inst.get("sources", []) if s in classes]
        generic = bool(args) and all(a == "_" for a in args)
        if inst.get("fromExtends"):
            continue
        if generic and len(srcs) == 1 and srcs[0] != tgt:
            forgetful_edges.add((srcs[0], tgt, inst["name"]))
        elif generic and len(srcs) > 1:
            derived[tgt].append({"name": inst["name"], "sources": srcs})
        elif args and args[0] != "_":
            concrete[args[0]][tgt].append(inst["name"])

    # Drop forgetful edges that duplicate an extends edge.
    ext_pairs = {(a, b) for a, b, _ in extends_edges}
    forgetful_edges = {e for e in forgetful_edges if (e[0], e[1]) not in ext_pairs}

    # Children map for class pages and reachability.
    parents_of: dict[str, set[str]] = defaultdict(set)
    children_of: dict[str, set[str]] = defaultdict(set)
    for a, b, _ in extends_edges | forgetful_edges:
        parents_of[a].add(b)
        children_of[b].add(a)

    def ancestors(start: str) -> set[str]:
        seen, stack = set(), [start]
        while stack:
            x = stack.pop()
            for y in parents_of.get(x, ()):
                if y not in seen:
                    seen.add(y)
                    stack.append(y)
        return seen

    # Concrete types: direct classes (with one witnessing instance each) and the size of the
    # upward closure. The closure itself is recomputed client-side from the edges.
    types_out = []
    for tname, per_class in concrete.items():
        direct = sorted(per_class)
        closure = set(direct)
        for c in direct:
            closure |= ancestors(c)
        types_out.append({
            "id": tname,
            "direct": [[c, per_class[c][0]] for c in direct],
            "count": len(closure),
        })
    types_out.sort(key=lambda t: (t["id"] in TRANSPORT_TYPES, -t["count"]))
    type_rank = {t["id"]: i for i, t in enumerate(types_out)}

    hidden = lambda n, c: (c.get("module") or "").startswith(HIDE_PREFIXES) or n.startswith(HIDE_PREFIXES)  # noqa: E731

    # Citation counts from the Theorems build (if it has run) order the "assumed by" samples.
    rank_path = Path(__file__).resolve().parent.parent / "out" / "atlas" / "rank.json"
    rank = json.loads(rank_path.read_text(encoding="utf-8")) if rank_path.exists() else {}
    for c, lst in assumes.items():
        lst.sort(key=lambda nm: -(rank.get(nm) or [0])[0])

    index_classes = []
    for name, c in sorted(classes.items()):
        index_classes.append({
            "id": name,
            "family": family_of(c.get("module")),
            "module": c.get("module"),
            "arity": c.get("numExplicitArgs", 0),
            "doc": short_doc(c.get("doc")),
            "extends": sorted(p["name"] for p in c.get("parents", []) if p["name"] in classes),
            "instances": direct_instance_count[name],
            "assumedBy": len(assumes.get(name, [])),
            "hidden": hidden(name, c),
        })
    edges = [{"from": a, "to": b, "kind": "extends", "via": v} for a, b, v in sorted(extends_edges)]
    edges += [{"from": a, "to": b, "kind": "forgetful", "via": v} for a, b, v in sorted(forgetful_edges)]

    fam_counts = Counter(c["family"] for c in index_classes if not c["hidden"])
    families = [{"id": f, "label": FAMILY_LABELS[f], "classes": fam_counts.get(f, 0)} for f in FAMILY_LABELS]

    index = {
        "snapshot": snapshot or {},
        "classes": index_classes,
        "edges": edges,
        "types": types_out[:400],
        "families": families,
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / "index.json").write_text(json.dumps(index, separators=(",", ":")), encoding="utf-8")
    (out / "families.json").write_text(json.dumps(families, indent=1), encoding="utf-8")

    cls_dir = out / "classes"
    cls_dir.mkdir(exist_ok=True)
    for name, c in classes.items():
        page = {
            "id": name,
            "family": family_of(c.get("module")),
            "module": c.get("module"),
            "doc": c.get("doc"),
            "arity": c.get("numExplicitArgs", 0),
            "isStructure": c.get("isStructure", False),
            "ownFields": c.get("ownFields", []),
            "parents": [p for p in c.get("parents", []) if p["name"] in classes],
            "ancestors": sorted(ancestors(name)),
            "children": sorted(children_of.get(name, ())),
            "forgetfulOut": sorted({b for a, b, _ in forgetful_edges if a == name}),
            "forgetfulIn": sorted({a for a, b, _ in forgetful_edges if b == name}),
            "derivedInstances": derived.get(name, [])[:50],
            # Most broadly structured types first (Real before an obscure completion).
            "concreteTypes": sorted(
                ({"type": t, "instances": per[name]} for t, per in concrete.items() if name in per),
                key=lambda x: type_rank.get(x["type"], 10**9),
            )[:100],
            "assumedBy": {"count": len(assumes.get(name, [])), "sample": assumes.get(name, [])[:50]},
        }
        (cls_dir / f"{name}.json").write_text(json.dumps(page, separators=(",", ":")), encoding="utf-8")

    summary = {
        "classes": len(classes),
        "visible_classes": sum(1 for c in index_classes if not c["hidden"]),
        "extends_edges": len(extends_edges),
        "forgetful_edges": len(forgetful_edges),
        "instances": len(instances),
        "concrete_types": len(types_out),
        "index_bytes": (out / "index.json").stat().st_size,
    }
    return summary


if __name__ == "__main__":
    import sys

    src = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent.parent / "cache" / "extract" / "mathlib.ndjson"
    print(json.dumps(build(src), indent=1))
