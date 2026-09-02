# extractor

A Lean 4 Lake project that imports Mathlib and writes newline-delimited JSON. `--mode records` (default)
describes classes, instances, typeclass assumptions, and deprecations (Structures and Map views);
`--mode deps` writes the per-constant dependency edges (Theorems view). Pinned to the Mathlib tag named in
`site/lib/snapshot.ts`. See `docs/extractor.md` and `docs/atlas.md`.
