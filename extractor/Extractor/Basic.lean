/-!
# Mathlib Map extractor

Walks the Mathlib environment and writes newline-delimited JSON. Phase 1 fills this in with
classes, instances, and typeclass assumptions; Phase 3 adds explicit premises, axioms, and
deprecations.
-/

namespace MathlibMap

def version : String := "0.1.0"

end MathlibMap
