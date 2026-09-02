# Runbook: the data pipeline

`pipeline/` is a Python 3.12 project managed with uv.

```bash
cd pipeline
uv sync                      # installs deps into .venv
uv run mathlibmap fetch      # downloads every registered source into cache/ (idempotent)
uv run mathlibmap fetch --with-edges   # also the 585 MB MathNetwork edge list
uv run mathlibmap report     # headline counts, a sanity check that fetch worked
uv run pytest -q
```

**Source registry.** `mathlibmap/sources.py` is the only file that knows upstream URLs and licenses; the
About page's table mirrors it by hand. Add a source there first.

**Cache.** `pipeline/cache/<source key>/…` is gitignored and resumable (a `.part` file is renamed only when
the download completes). Delete a source's folder to force a refetch.

**Snapshots.** Inputs describe different Mathlib commits (mathlib-types: `types-v4.33.0`; MathNetwork:
commit 534cf0b, 2026-02-02). Until the Lean extractor replaces the MathNetwork edges, joins are by
declaration name and a name missing on one side is dropped, never guessed.

**Next steps by phase.** Phase 1 adds the hierarchy build (classes, instances, families). Phase 2 adds MSC
classification with a cache keyed on (module, docstring hash) and the coverage join. Phase 3 adds the spine
filter, rank, foundations, shards, and the upload step.
