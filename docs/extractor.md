# Runbook: the Lean extractor

`extractor/` is a Lake project pinned to Mathlib `v4.33.0` (its `lean-toolchain` is copied from that tag;
elan installs the matching Lean automatically). It walks the environment and writes newline-delimited JSON.

```bash
cd extractor
lake update            # once; clones Mathlib and its dependencies
lake exe cache get     # downloads Mathlib's compiled oleans (several GB; fast if already cached)
lake build
lake exe extractor --modules Mathlib.Algebra.Group.Defs --out /tmp/small.ndjson   # seconds
lake exe extractor --modules Mathlib --out ../pipeline/cache/extract/mathlib.ndjson  # minutes, ~8 GB RAM
```

Flags: `--modules A,B` (what to import; default `Mathlib`), `--out FILE`, `--decl-prefix Mathlib`
(only declarations from modules under this prefix get `decl` records; classes and instances are always
emitted for the whole environment, including core and Batteries).

**Records** (one JSON object per line, discriminated by `kind`):

- `class`: `name`, `module`, `doc`, `isStructure`, `numExplicitArgs`, `numInstArgs`, `parents`
  (`name`, `projFn`, `subobject`), `ownFields` (fields not inherited from a parent).
- `instance`: `name`, `module`, `priority`, `attrKind`, `target` (the class produced), `args` (head
  constant of each argument of the conclusion, `_` for a bound variable, so `Field ℝ` gives `["Real"]`),
  `sources` (classes of the instance-implicit binders), `fromExtends` (the projection Lean generated for
  an `extends` clause).
- `decl`: `name`, `module`, `declKind`, `assumes` (classes of the instance-implicit binders),
  `deprecatedTo`, `deprecatedSince`.

**Why not `withImportModules`.** In Lean 4.33 it imports with `loadExts := false`, which leaves the
instance and structure tables empty and every class looks parentless. The extractor calls
`importModules (loadExts := true)` after `enableInitializersExecution` instead.

**Noise filter.** `decl` records skip `Name.isInternal`, `Name.isInternalDetail`, numeric components,
and `match_*` / `proof_*` / `eq_N` auxiliaries. Nothing is filtered for classes and instances.

**Verification on the small module** (`Mathlib.Algebra.Group.Defs`): 418 classes, 7,170 instances,
2,052 declarations; `CommMonoid` lists parents `Monoid` (subobject) and `CommSemigroup`;
`CommMonoid.toMonoid` is an instance with `fromExtends: true`, priority 1000.
