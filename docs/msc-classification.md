# Runbook: MSC classification of Mathlib modules

**What it does.** `uv run mathlibmap classify` assigns every Mathlib module a primary MSC2020 subject
code (a 2-digit area plus a letter, e.g. `11A`) and up to two secondary codes, using Gemini 3.1 Flash
Lite on Vertex AI (project `mathlibmap`, location `global`, temperature 0, structured JSON output).
The model sees the module path, the first 700 characters of its module docstring (from the Mathlib
checkout under `extractor/.lake/packages/mathlib`), and its six most common declaration namespaces.
Ten modules per call, six calls in flight; the full library (7,751 modules after rule-based exclusions)
takes about 12 minutes and well under a dollar.

**Auth.** Calls use `gcloud auth print-access-token` (your user credentials), refreshed every 45
minutes. No service account or API key is stored anywhere.

**Cache.** `pipeline/cache/msc/results.jsonl` keyed by a hash of (module, docstring, namespaces,
model). A rerun only pays for modules whose inputs changed. Delete the file to reclassify everything.

**Rules before the model.** `Mathlib.Tactic`, `Mathlib.Util`, `Mathlib.Lean`, `Mathlib.Testing`,
`Mathlib.Mathport`, and `Mathlib.Init` are `NONE` (not mathematics) without a call. The model may also
answer `NONE` for infrastructure files; 540 modules ended up `NONE` on v4.33.0.

**Overrides.** `data/curated/msc-overrides.yaml` maps a module to a code (or `NONE`) and always wins.
Use it for anything reported through the "wrong area" link on an area page.

**Validation (v4.33.0).** For the 190 theorems on the 1000+ list that are formalized in Mathlib and
whose declaration we could locate, the model's 2-digit area for the file agreed with the list's own
`msc_classification` in **139 cases (73%)**. The disagreements are mostly boundary cases where the
list classifies the theorem and the model classifies the file it lives in: the squeeze theorem and
Cantor's intersection theorem (list: 26 real functions; file: 54 general topology), the isomorphism
theorems (list: 16 rings; file: 20 groups), monotone convergence (list: 26; file: 28 measure theory).
Treat the 85% target from the plan as not met by this measure, and treat the measure itself as a
rough one; the area pages show every file's code so readers can dispute it.

**Distribution (v4.33.0, modules by primary area).** 18 category theory 1,575 · 13 commutative algebra
809 · 06 order 571 · 11 number theory 494 · 20 groups 456 · 54 topology 456 · 46 functional analysis
346 · 05 combinatorics 341 · 28 measure 287 · 15 linear algebra 277 · 16 rings 251.

**Prompt-injection stance.** Module docstrings are wrapped in `<doc>` tags and the system prompt says
they are data, never instructions.
