# Runbook: the Theorems view (dependency atlas)

**Extraction.** `lake exe extractor --mode deps --modules Mathlib --out pipeline/cache/extract/deps.ndjson`
writes one line per constant in the environment (771,129 at v4.33.0, 80 s, 7 GB RSS):
`{"i": id, "k": kind, "t": [ids in the type], "v": [ids only in the value], "e": [ids in explicit positions of the value]}`
plus `deps.ndjson.names.txt` (id order). Theorem bodies are read with `value? (allowOpaque := true)`;
without that flag Lean reports no value for theorems and every proof looks empty. Simp `_auxLemma`s are
unfolded into the lemmas they wrap. Explicitness is syntactic: at an application with a constant head, the
head's signature says which arguments are explicit; other heads count all arguments as explicit. Each shared
subterm is visited once, so the traversal is linear in the DAG size.

**Build.** `uv run mathlibmap atlas` (about 8 minutes, most of it writing files):

1. Spine nodes: Mathlib theorems, definitions, and inductives from the decl records, minus tooling
   modules, instances, and `inst*`-named declarations. 300,710 at v4.33.0.
2. Spine edges: target appears in the statement (`t`) or in an explicit proof position (`e`), both ends in
   the spine. 3,175,709 edges (2,123,889 statement, 2,497,457 proof; edges can be both).
3. `citedBy` = number of spine *theorems* whose statement or proof uses the node. PageRank is computed
   too but only used for ordering.
4. Axioms: a bitmask (`propext`, `Classical.choice`, `Quot.sound`, `sorryAx`, other) OR-propagated over
   the full graph (type and value edges of every constant) to a fixpoint. 210,532 spine nodes use all
   three standard axioms; 38,596 use none.
5. Depth: longest path to a leaf over the full graph, computed on the strongly-connected condensation
   (Lean's environment has reference cycles between a structure and its recursor; without condensing,
   one cycle inflates everything above it). Max 361.
6. "Rests on N definitions": a breadth-first count of definitions reachable in the full graph, computed
   for the 3,000 most cited nodes only (a full sweep would be 300K BFS runs).
7. Shards: `nodes/<sha1 prefix>/<percent-encoded name>.json` (statement and docstring from
   mathlib-types, module, area, assumptions, deprecation, famous-list tags, citedBy, depth, axioms, up to
   200 cites and 200 cited-by each ranked by citedBy, a 30-node star), `search/<2 chars>.json` (names
   containing a component that starts with those two characters, with kind and citedBy), `rank.json`
   (name -> [citedBy, kind], read by the map and hierarchy builders), `meta.json`.

**Name encoding.** Python's `quote(name, safe="")` on the pipeline side and `pyQuote()` in
`site/lib/atlas-data.ts` on the site side; they agree on `'`, `(`, `)`, `!`, `*`, which
`encodeURIComponent` alone would leave bare.

**Upload.** `uv run mathlibmap upload atlas` stages ~300K gzipped files and syncs them (about 20 minutes
at ~270 objects per second). Upload the data before pushing site code that depends on a new field.

**Known limits.** Citation counts follow the paper's finding that definitions used in statements dominate
(`DFunLike.coe`, `Set`, `Real` top the list); the area pages therefore rank *theorems* only. Explicitness
is an approximation of "would appear pretty-printed"; instance arguments and implicit type arguments are
excluded, which is the point. The `/api/graph` closure and path endpoints from the plan are not built yet;
pages show precomputed depth, axioms, direct cites, and (for the top 3,000) transitive definition counts.
