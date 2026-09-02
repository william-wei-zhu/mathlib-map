# Announcement drafts

Nothing here is posted automatically. William posts when he is ready.

## Zulip `#mathlib4` · Structures view (Phase 1 milestone)

**Subject:** Interactive Mathlib class hierarchy explorer

Hi all. I built an interactive explorer for Mathlib's typeclass hierarchy and would love feedback:
https://mathlibmap.com/hierarchy

What it does:

- Pick a family (Algebra, Order, Topology, Analysis, Category theory, …) and see the most-used classes as
  a layered diagram: solid edges are `extends`, dashed edges are forgetful instances, more general classes
  sit higher. Pan and zoom like a map.
- Focus on a class to see everything above and below it, e.g.
  https://mathlibmap.com/hierarchy?focus=Field
- Light up a concrete type to see every structure it satisfies, e.g. `Real` satisfies 298 classes:
  https://mathlibmap.com/hierarchy?focus=Field&type=Real
- Every class has a page (what it extends, what extends it, forgetful instances, concrete types that are
  instances, how many declarations assume it), plus a chain finder that answers "how is `Real` a
  `NormedField`?" hop by hop: https://mathlibmap.com/class/Field

How it is built: a small Lean program imports Mathlib (v4.33.0) and walks the environment for classes,
`extends` parents, and instances (2,408 classes, 42,904 instances, about 100 s). A Python step turns that
into JSON; the site reads it statically. Everything is public: https://github.com/william-wei-zhu/mathlib-map

Known limits: the family view shows the 80 most-used classes by default (there is a "show all" toggle);
family assignment comes from the module path; instances with more than one source class are listed on class
pages but not drawn as edges. This is a snapshot of v4.33.0 and will be refreshed monthly.

Two more views are coming: a map of which areas of mathematics Mathlib covers, and theorem pages with
dependencies filtered down to the mathematics. Suggestions on what would make this useful to you are very
welcome.
