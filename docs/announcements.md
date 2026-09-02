# Announcement drafts

Nothing here is posted automatically. William posts when he is ready.

## Zulip `#general` · launch (all three views)

**Subject:** Mathlib Map: a map of what is in Mathlib, its structures, and what each theorem rests on

Hi all. I built a site that draws three views of Mathlib from the library itself, and I would love
feedback: https://mathlibmap.com

- **Map**: every MSC2020 area, sized by how many Mathlib declarations it holds and colored by how many of
  its famous theorems (from the 1000+ list) are formalized. Category theory is the largest area; 199 of the
  1,200 listed theorems are in Mathlib; dynamical systems has 0 of 24. Each area page lists the famous
  theorems still missing, the open conjectures stated in Lean, undergraduate gaps, and every file with its
  assigned subject.
- **Structures**: the typeclass hierarchy as a pan-and-zoom diagram (`extends` solid, forgetful instances
  dashed), with focus mode (everything above and below a class), a type highlighter (`Real` satisfies 298
  classes), and a chain finder that answers "how is ℝ a `NormedField`?" hop by hop.
  https://mathlibmap.com/hierarchy?focus=Field&type=Real
- **Theorems**: a page for every declaration with its statement, what it cites and what cites it (with
  the elaborator plumbing filtered out), depth from the axioms, and the axioms used. Search by name, and a
  guided descent: https://mathlibmap.com/tour/bertrand

How it is built: a Lean program walks the environment (classes, instances, and for every constant the
constants used in its type and in explicit positions of its proof; 771K constants in 80 s), a Python
pipeline filters, ranks, classifies files by MSC area with a language model (cached, overridable, 73%
agreement with the 1000+ list's own areas), and the site reads small JSON files from a public bucket. The
derived data is downloadable from the About page. Everything is public:
https://github.com/william-wei-zhu/mathlib-map

Known limits: citation counts follow statements as much as proofs, so definitions like `Set` and `Real`
top the global list (area pages rank theorems only); explicitness is a syntactic approximation; the subject
of a file is the model's reading of its docstring, and every area page has a link to report a misplaced
file. This is a snapshot of v4.33.0, refreshed monthly.

Suggestions for what would make this useful in your own work are very welcome.

## Shorter version for `#mathlib4` or a thread reply

I made mathlibmap.com: a treemap of which areas of mathematics Mathlib covers (with the 1000+ list as the
denominator), an interactive typeclass hierarchy with a chain finder, and a page per declaration showing
what it cites, what cites it, and its depth from the axioms. Built from a Lean environment walk plus a Python
pipeline; source and data are public. Feedback welcome.
