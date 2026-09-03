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
commit 534cf0b, 2026-02-02). The Theorems view now uses the Lean extractor's own edges rather than
MathNetwork's, so those layers share the `v4.33.0` tag; joins are by declaration name and a name missing on
one side is dropped, never guessed.

**Build stages.** Each subcommand reads the cache (and, where noted, the extractor output) and writes to
`out/`:

- `hierarchy` builds the Structures view (classes, instances, families) from the records-mode extractor.
- `classify` assigns each module an MSC area with a cache keyed on (module, docstring, namespaces, model);
  see `docs/msc-classification.md`.
- `map` builds the Map view (areas, coverage, overlays) from the classification and the extractor counts,
  and calls `embed.py` to place areas on the World map: horizontal = citation-relatedness (spectral),
  vertical = foundational depth (from `atlas/area-depth.json`), writing `area["pos"]` into `map/index.json`.
- `atlas` builds the Theorems view (spine filter, rank, foundations, node and search shards, `rank.json`,
  `area-depth.json`) from the deps-mode extractor; see `docs/atlas.md`.
- `search` rebuilds the name-search shards; `downloads` re-runs the atlas build with `write_pages=False`
  to refresh `rank.json`/`area-depth.json`/search shards/`meta.json` and the downloadable datasets
  without rewriting the 300K node pages.
- `upload` gzips an `out/` subdirectory and syncs it to the bucket; see `docs/gcs.md`.

The monthly job runs these in order (`hierarchy` and `map` twice, so they pick up the citation ranks);
see `docs/ci.md`.
