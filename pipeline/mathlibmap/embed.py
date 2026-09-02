"""Spatial embedding of MSC areas for the World map.

Places related areas near each other so the World map reads as a real territory (nearby = related),
using cross-area citation counts from the dependency graph as the relatedness signal. A spectral
layout (Laplacian eigenmaps on the normalized cross-area weight matrix) gives the meaningful
structure; a short overlap-relaxation pass, sized by each area's declaration count, keeps the
region blobs from colliding.

Consumed by the site as `area["pos"] = [x, y]` in out/map/index.json. Positions live in a
1200 x 760 viewBox with margins. If the dependency inputs are absent (e.g. a fetch without the
extractor cache), compute_positions returns {} and the World map falls back to a size-ordered
arrangement.

Run standalone to patch an existing index.json in place:
    cd pipeline && uv run python -m mathlibmap.embed
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "cache"
OUT = ROOT / "out"

VIEW_W = 1200.0
VIEW_H = 760.0
MARGIN = 70.0
# Radius model (must match the site's AtlasCanvas): r = sqrt(size/maxsize) * R_SPAN + R_MIN.
R_MIN = 20.0
R_SPAN = 80.0


def _area_of_module(cls: dict, m: str) -> str | None:
    rec = cls.get(m)
    if not rec:
        return None
    p = rec["primary"]
    return None if p in ("NONE", "UNKNOWN") else p[:2]


def area_edge_weights() -> tuple[list[str] | None, np.ndarray | None]:
    """Symmetric cross-area citation counts (statement + explicit-proof edges).

    Returns (codes, W) where W[i][j] is the number of citations between area i and area j, or
    (None, None) when the extractor cache is not present.
    """
    deps = CACHE / "extract" / "deps.ndjson"
    names_f = CACHE / "extract" / "deps.ndjson.names.txt"
    mathlib = CACHE / "extract" / "mathlib.ndjson"
    modules = OUT / "msc" / "modules.json"
    if not (deps.exists() and names_f.exists() and mathlib.exists() and modules.exists()):
        return None, None

    cls = json.loads(modules.read_text(encoding="utf-8"))["modules"]

    name_mod: dict[str, str] = {}
    with mathlib.open(encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            if r["kind"] == "decl":
                name_mod[r["name"]] = r.get("module") or ""

    names = names_f.read_text(encoding="utf-8").split("\n")
    if names and names[-1] == "":
        names.pop()

    codes = sorted({a for m in cls for a in [_area_of_module(cls, m)] if a})
    idx = {c: i for i, c in enumerate(codes)}
    id_area = np.full(len(names), -1, dtype=np.int32)
    for i, nm in enumerate(names):
        a = _area_of_module(cls, name_mod.get(nm, ""))
        if a is not None:
            id_area[i] = idx[a]

    k = len(codes)
    W = np.zeros((k, k), dtype=np.float64)
    with deps.open(encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            ai = id_area[r["i"]]
            if ai < 0:
                continue
            for j in (*r["t"], *r["e"]):
                aj = id_area[j]
                if aj >= 0 and aj != ai:
                    W[ai, aj] += 1.0
    W = W + W.T
    return codes, W


def _spectral(W: np.ndarray) -> np.ndarray:
    """2D Laplacian eigenmap of the normalized weight matrix."""
    k = len(W)
    if k < 3:
        return np.random.default_rng(0).standard_normal((k, 2))
    d = W.sum(1)
    d[d == 0] = 1.0
    dinv = 1.0 / np.sqrt(d)
    S = W * np.outer(dinv, dinv)
    L = np.diag(S.sum(1)) - S
    vals, vecs = np.linalg.eigh(L)
    order = np.argsort(vals)
    xy = vecs[:, order[1:3]].copy()  # skip the ~0 (constant) eigenvector
    return xy


def _fr(pos: np.ndarray, W: np.ndarray, radii: np.ndarray, iters: int = 550, gravity: float = 0.05) -> np.ndarray:
    """Weighted Fruchterman-Reingold, seeded by the spectral positions: repulsion between every
    pair spreads the areas; attraction along weighted cross-area citation edges pulls related areas
    together; a gravity pull toward the centre keeps weakly-connected areas from stranding off on
    their own. Fills the viewBox evenly with no isolated outliers.
    """
    pos = pos.astype(np.float64).copy()
    k = len(pos)
    center = np.array([VIEW_W / 2, VIEW_H / 2])
    K = 0.85 * math.sqrt(VIEW_W * VIEW_H / k)  # ideal edge length
    Wn = W / (W.max() or 1.0)
    temp = VIEW_W * 0.12
    for _ in range(iters):
        disp = np.zeros_like(pos)
        for i in range(k):
            delta = pos[i] - pos
            dist = np.hypot(delta[:, 0], delta[:, 1])
            dist[i] = np.inf
            dist = np.maximum(dist, 1e-3)
            rep = (K * K) / dist                      # repulsion
            attr = (dist * dist) / K * Wn[i]          # attraction along weighted edges
            f = (rep - attr) / dist
            f[i] = 0.0                                 # no self force (avoids 0*inf NaN)
            disp[i] = (delta * f[:, None]).sum(0)
        d = np.hypot(disp[:, 0], disp[:, 1])
        d[d == 0] = 1.0
        pos += disp / d[:, None] * np.minimum(d, temp)[:, None]
        pos += (center - pos) * gravity               # gravity keeps the layout compact
        pos[:, 0] = np.clip(pos[:, 0], radii + 4.0, VIEW_W - radii - 4.0)
        pos[:, 1] = np.clip(pos[:, 1], radii + 4.0, VIEW_H - radii - 4.0)
        temp *= 0.985
    return pos


def _layout(pos: np.ndarray, radii: np.ndarray, iters: int = 800, pad: float = 10.0) -> np.ndarray:
    """Size-aware force layout in viewBox coordinates: a decaying spring keeps the spectral
    structure (related areas near each other) while collision resolution separates the blobs.
    Runs directly in output coordinates with the site's real radii, so there is no post-rescale
    to reintroduce overlap; positions are clamped inside the viewBox each step.
    """
    target = pos.astype(np.float64).copy()
    pos = pos.astype(np.float64).copy()
    k = len(pos)
    for it in range(iters):
        spring = 0.05 * (1.0 - it / iters)  # structure early, pure separation late
        pos += (target - pos) * spring
        for i in range(k):
            diff = pos[i] - pos
            dist = np.hypot(diff[:, 0], diff[:, 1])
            dist[i] = np.inf
            over = (radii[i] + radii + pad) - dist
            for j in np.where(over > 0)[0]:
                d = dist[j] if dist[j] > 1e-6 else 1e-6
                step = diff[j] / d * (over[j] * 0.5)
                pos[i] += step
                pos[j] -= step
            pos[i, 0] = min(max(pos[i, 0], radii[i] + 4.0), VIEW_W - radii[i] - 4.0)
            pos[i, 1] = min(max(pos[i, 1], radii[i] + 4.0), VIEW_H - radii[i] - 4.0)
    return pos


def compute_positions(size_by_code: dict[str, int]) -> dict[str, list[float]]:
    """Return {area code: [x, y]} in the 1200 x 760 viewBox, for areas with declarations."""
    codes, W = area_edge_weights()
    if codes is None:
        return {}
    keep = [c for c in codes if size_by_code.get(c, 0) > 0]
    if len(keep) < 3:
        return {}
    ci = {c: i for i, c in enumerate(codes)}
    sub = np.array([ci[c] for c in keep])
    Wk = W[np.ix_(sub, sub)]

    xy = _spectral(Wk)
    xy = xy - xy.mean(0)
    span = np.abs(xy).max(0)
    span[span == 0] = 1.0
    xy = xy / span

    sizes = np.array([size_by_code[c] for c in keep], dtype=np.float64)
    radii = np.sqrt(sizes / sizes.max()) * R_SPAN + R_MIN
    maxr = float(radii.max())

    pos = np.column_stack([
        VIEW_W / 2 + xy[:, 0] * (VIEW_W / 2 - maxr - MARGIN),
        VIEW_H / 2 + xy[:, 1] * (VIEW_H / 2 - maxr - MARGIN),
    ])
    # Force layout (with gravity) keeps the areas compact and related ones together, no strays.
    pos = _fr(pos, Wk, radii)

    # Isotropic fit to the viewBox (no per-axis distortion, so nothing gets stretched into a
    # stray), then a collision pass to guarantee no overlaps.
    lo = pos.min(0)
    hi = pos.max(0)
    c = (lo + hi) / 2
    sx = (VIEW_W - 2 * MARGIN) / max(hi[0] - lo[0] + 2 * maxr, 1e-6)
    sy = (VIEW_H - 2 * MARGIN) / max(hi[1] - lo[1] + 2 * maxr, 1e-6)
    scale = min(sx, sy, 1.6)
    pos = (pos - c) * scale + np.array([VIEW_W / 2, VIEW_H / 2])
    pos = _layout(pos, radii, iters=300)

    out: dict[str, list[float]] = {}
    for c, p in zip(keep, pos):
        out[c] = [round(float(p[0]), 1), round(float(p[1]), 1)]
    return out


def _patch_index() -> int:
    idx_path = OUT / "map" / "index.json"
    data = json.loads(idx_path.read_text(encoding="utf-8"))
    pos = compute_positions({a["code"]: a["declarations"] for a in data["areas"]})
    for a in data["areas"]:
        if a["code"] in pos:
            a["pos"] = pos[a["code"]]
    idx_path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
    return len(pos)


if __name__ == "__main__":
    print("positioned", _patch_index(), "areas")
