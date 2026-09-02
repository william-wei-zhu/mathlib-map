# Mathlib Map

**Every theorem in Mathlib, on the map.** [mathlibmap.com](https://mathlibmap.com)

One interactive map of Lean's Mathlib. The whole site is a single explorable map, like Google Maps:
the map fills the screen, everything else opens in a collapsible left sidebar over it, and a search
bar up top jumps to any area, structure, or theorem. There is no page without the map behind it.

You explore by zooming through altitudes of the same map:

- **World**: every area of mathematics as a real territory. Areas that share theorems sit near each
  other (a spatial embedding of cross-area citations), sized by how many Mathlib declarations they
  hold and shaded by how much of their famous mathematics is formalized.
- **Region**: click an area to descend into it and see its landmark theorems as nodes, sized by how
  often each is cited.
- **Theorem**: click a theorem to walk its dependency graph, what it cites and what cites it, with
  statement dependencies and proof citations drawn differently, node by node down to the axioms.
- **Structures** is a toggleable layer: the typeclass hierarchy, from Monoid to Field and beyond.

An independent project, not affiliated with the Mathlib community or the Lean FRO.

## Layout

- `site/`: the Next.js website (deployed on Vercel). The map interface lives in
  `site/components/atlas/` (the shell, canvas, search, layers, theorem graph); data is read from a
  public GCS bucket, no database at request time.
- `pipeline/`: Python data pipeline (fetch, join, classify, rank, shard, embed, upload). The World
  map's spatial layout is computed in `pipeline/mathlibmap/embed.py`.
- `extractor/`: Lean 4 program that walks the Mathlib environment.
- `data/curated/`: hand-maintained inputs (tours, hierarchy families, overrides).
- `docs/`: runbooks.

Built by [William Zhu](https://www.linkedin.com/in/william-wei-zhu/).
