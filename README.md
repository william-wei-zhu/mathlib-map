# Mathlib Map

**Every theorem in Mathlib, on the map.** [mathlibmap.com](https://mathlibmap.com)

Work in progress. Three views over Lean's Mathlib, built on one data pipeline:

- **Map**: a zoomable map of mathematics colored by how much of each area is formalized.
- **Structures**: the typeclass hierarchy, with a path finder from any type to any class.
- **Theorems**: what each result cites, who cites it, and what it rests on down to the axioms.

An independent project, not affiliated with the Mathlib community or the Lean FRO.

## Layout

- `site/`: the Next.js website (deployed on Vercel).
- `pipeline/`: Python data pipeline (fetch, join, classify, rank, shard, upload).
- `extractor/`: Lean 4 program that walks the Mathlib environment.
- `data/curated/`: hand-maintained inputs (tours, hierarchy families, overrides).
- `docs/`: runbooks.

Built by [William Zhu](https://www.linkedin.com/in/william-wei-zhu/).
