# Announcement drafts

Nothing here is posted automatically. William posts when he is ready.

## Zulip `#general` · launch

**Subject:** Mathlib Map: one interactive map of what is in Mathlib, its structures, and what each theorem rests on

Hi all. I built a site that turns Mathlib into one explorable map, like Google Maps, drawn from the
library itself, and I would love feedback: https://mathlibmap.com

The whole site is a single map you zoom through, with everything else in a collapsible side panel over it:

- **World**: every MSC2020 area as a territory, placed so areas that share theorems sit near each other,
  sized by how many Mathlib declarations it holds and shaded by how many of its famous theorems (from the
  1000+ list) are formalized. Category theory is the largest area; 199 of the 1,200 listed theorems are in
  Mathlib; dynamical systems has 0 of 24.
- **Region**: click an area to descend into it and see its landmark theorems as nodes, sized by citations.
  Each area's panel lists the famous theorems still missing, the open conjectures stated in Lean,
  undergraduate gaps, and every file with its assigned subject.
- **Theorem**: click a theorem to walk its dependency graph, what it cites and what cites it (statement
  dependencies dashed, proof citations solid, elaborator plumbing filtered out), with depth from the axioms
  and the axioms used. https://mathlibmap.com/decl/Nat.bertrand
- **Structures** is a toggleable layer: the typeclass hierarchy (`extends` solid, forgetful instances
  dashed), with focus mode, a type highlighter (`Real` satisfies 298 classes), and a chain finder that
  answers "how is ℝ a `NormedField`?" hop by hop. https://mathlibmap.com/hierarchy?focus=Field&type=Real

A search bar up top jumps to any area, structure, or theorem, and a guided descent walks a chain from a
theorem down to `Nat.Prime`: https://mathlibmap.com/tour/bertrand

How it is built: a Lean program walks the environment (classes, instances, and for every constant the
constants used in its type and in explicit positions of its proof; 771K constants in 80 s), a Python
pipeline filters, ranks, classifies files by MSC area with a language model (cached, overridable, 73%
agreement with the 1000+ list's own areas), computes the areas' spatial layout, and the site reads small
JSON files from a public bucket. The derived data is downloadable from the About panel. Everything is
public: https://github.com/william-wei-zhu/mathlib-map

Known limits: citation counts follow statements as much as proofs, so definitions like `Set` and `Real`
top the global list (area panels rank theorems only); explicitness is a syntactic approximation; the subject
of a file is the model's reading of its docstring, and every area panel has a link to report a misplaced
file. This is a snapshot of v4.33.0, refreshed monthly.

Suggestions for what would make this useful in your own work are very welcome.

## Shorter version for `#mathlib4` or a thread reply

I made mathlibmap.com: one interactive map of Mathlib, like Google Maps. Zoom from a spatial map of the
areas of mathematics (sized by declarations, with the 1000+ list as the coverage denominator) into an
area's landmark theorems, then into any declaration's dependency graph, what it cites, what cites it, and
its depth from the axioms. The typeclass hierarchy is a toggleable layer with a chain finder. Search jumps
anywhere. Built from a Lean environment walk plus a Python pipeline; source and data are public. Feedback welcome.
