# Mathlib Map: project guide

**Mathlib Map** at [mathlibmap.com](https://mathlibmap.com). Tagline: "Every theorem in Mathlib, on the map."
Three views over Lean's Mathlib, built on one data pipeline. Display labels are verbatim everywhere:
**Map** (the frontier map, `/`), **Structures** (the typeclass hierarchy, `/hierarchy`), **Theorems**
(the dependency atlas, `/search` and `/decl/[name]`). Public repo `william-wei-zhu/mathlib-map`.

UI/UX and build conventions follow William's Web App Building Standard:
https://github.com/william-wei-zhu/web-app-building-standard

The approved build plan lives outside the repo at `~/.claude/plans/tell-me-about-lean-gentle-fog.md`;
this file is the running changelog of decisions taken while executing it.

## Layout

- `site/`: Next.js 16 App Router, Tailwind v4, shadcn/ui (radix-nova), next-themes, PostHog. Vercel
  project `mathlib-map` (team `wzhu1997-8978s-projects`) with **Root Directory = `site`**.
- `pipeline/`: Python 3.12 via uv. `uv run mathlibmap fetch` downloads every registered input into
  `pipeline/cache/` (gitignored); `uv run mathlibmap report` prints headline counts. Source registry
  with licenses: `pipeline/mathlibmap/sources.py`.
- `extractor/`: Lean 4 Lake project (Phase 1) that walks the Mathlib environment.
- `data/curated/`: hand-maintained inputs (tours, hierarchy families, MSC overrides).
- `docs/`: one runbook per integration.

## Decisions (with rationale)

- **2026-09-02 · Name.** "Mathlib Map" over "Mathlib Atlas" and "Mathlib Viz": shortest, says the value
  not the medium, matches the landing page. The name uses "Mathlib", so the About page and footer carry
  the non-affiliation line (`INDEPENDENCE_LINE` in `site/lib/site.ts`), like mathlib-changelog.org does.
- **2026-09-02 · Data on a public GCS bucket, not Firestore** (deviation from the standard's default).
  The data is a read-only monthly snapshot with millions of edges; Firestore is the wrong shape for graph
  neighborhoods. Bucket `gs://mathlibmap-data` (GCP project `mathlibmap`, us-central1, uniform access,
  `allUsers: objectViewer`, CORS for the site origins). Served straight from
  `storage.googleapis.com/mathlibmap-data` with long `Cache-Control`; no Cloud CDN in v1. See `docs/gcs.md`.
- **2026-09-02 · shadcn on Radix (`radix-nova`).** `shadcn init -d` now defaults to Base UI; the standard's
  reference build (pbcindex) and the shadcn skill both use Radix, so init was re-run with `--base radix -f`
  (it asks a y/N question even with `-d`; pipe `y`).
- **2026-09-02 · Type system.** Fraunces (display, `--font-display`), Literata (body, `--font-body`),
  JetBrains Mono (`--font-mono`, chosen for Unicode coverage of Lean identifiers such as ℝ, ∀, ⟨⟩). Base
  zoom `html { font-size: 120% }`, bumped `--text-*` scale, one accent (terracotta `--accent-ink`), solid
  near-ink/near-paper `--muted-foreground`, no opacity grays.
- **2026-09-02 · Icons and share image are rendered, not stored.** `app/icon.tsx`, `app/apple-icon.tsx`,
  `app/opengraph-image.tsx`, `app/twitter-image.tsx` rasterize the same SVG mark (`lib/logo-og.tsx`) via
  `next/og`, so there is one source of truth (`components/logo.tsx`). OG image is logo only; the words are
  the OG title (app name) and description (tagline).
- **2026-09-02 · Header nav is a segmented control**, not text links: the three view links are outlined
  pills (filled when active) so they read as clickable at rest, per the standard.
- **2026-09-02 · Snapshot constant.** `site/lib/snapshot.ts` names the Mathlib tag the site describes
  until the pipeline writes `graph/meta.json`; the footer reads it. mathlib-types on HuggingFace is at
  `types-v4.33.0`; MathNetwork's graph is at commit 534cf0b (2026-02-02, v4.28.0-rc1). Phase 3 replaces
  the MathNetwork edges with our own extractor output so all layers share one tag.
- **2026-09-02 · Family view shows the 80 most-used classes by default** (`assumedBy + instances`), with a
  "Show all N" toggle; Algebra alone has 342 visible unary classes and a full layout of that is slow and
  unreadable. Focus mode (ancestors + descendants of one class) is the intended way to read the diagram.
- **2026-09-02 · The hierarchy index carries only direct instances per type** (one witnessing instance per
  class); closures are recomputed client-side, which keeps the index at 1.5 MB instead of several.
- **2026-09-02 · Diagrams are 2D with Google-Maps-style pan and zoom, never 3D.** William asked for
  map-like zooming and whether 3D would help; decision: d3-zoom on an SVG group (wheel and pinch zoom,
  drag pan, plus/minus/fit buttons, `touch-none`), no 3D. Labels are the content, and in 3D they overlap,
  foreshorten, and lose the "more general sits higher" reading (Astrolabe's 3D graph is the cautionary
  example). The Map view reuses the same interaction.
- **2026-09-02 · No `loading.tsx` on `/class/[name]`.** A streaming boundary sends a 200 before
  `notFound()` can run, so unknown classes returned 200; without it the route returns a real 404.
- **2026-09-02 · Uploads are gzipped at rest.** `mathlibmap upload` stages gzipped copies and syncs them
  with `Content-Encoding: gzip` (`--gzip-in-flight-all` only compresses transport; `--gzip-local-all` is a
  `cp` flag that `rsync` rejects). The 1.5 MB index travels as 215 KB.
- **2026-09-02 · Map ramp and sizing.** Tiles are sized by declarations (theorems + definitions from the
  extractor, so the number matches the Structures view) and colored by famous-theorem coverage from the
  1000+ list (numerator and denominator both shown everywhere), one terracotta ramp per theme in
  `site/lib/ramp.ts`, neutral for areas with no listed theorems. Areas with zero declarations are not drawn.
  On phones the treemap is hidden and the ranked table is the map. Category theory being the largest area
  is real (1,575 files), not a classification artifact.
- **2026-09-02 · The bucket's edge cache can serve stale JSON for up to an hour after an upload**, and a
  Vercel build prerenders `/` from that JSON. A deploy that requires a brand-new field failed once
  (`short` missing). Rule: UI code tolerates missing optional fields (`shortName()` fallback), and data is
  uploaded before the code that reads it is pushed.
- **2026-09-02 · Area page JSON uses `files` for the file list and `modules` for the count.** They briefly
  shared the key `modules` and the lead sentence rendered "[object Object]".
- **2026-09-02 · gcloud needs Python 3.12.** The system gcloud fails on Python 3.9; every gcloud call sets
  `CLOUDSDK_PYTHON=$(uv python find 3.12)`.

## Status

- **2026-09-02 · Phase 0 done.** Site live at mathlibmap.com (brand, theme, header, footer, About, Privacy,
  Settings, icons and share image), pipeline fetches every input, bucket public.
- **2026-09-02 · Phase 1 (Structures) first cut live.** Extractor run on all of Mathlib v4.33.0: 2,408 classes,
  42,904 instances, 349,828 declarations, 101 s wall clock, 5.9 GB peak RSS. Hierarchy build: 2,109 visible
  classes, 1,038 `extends` edges, 438 forgetful-instance edges, 5,009 concrete types; `hierarchy/index.json`
  is 1.5 MB (gzipped by the bucket). Sanity checks pass: `Field` extends `CommRing` and `DivisionRing`,
  `Real` satisfies 298 classes, `CommRing` is assumed by 28,164 declarations.
  Routes: `/hierarchy` (family tabs, focus, type highlight, elkjs layered layout in `hierarchy-diagram.tsx`)
  and `/class/[name]` (server-rendered from `hierarchy/classes/<name>.json`, path finder client-side from
  the index). Data contract lives in `site/lib/data.ts` and `site/lib/hierarchy-client.ts`.

- **2026-09-02 · Phase 2 (Map) first cut live.** `uv run mathlibmap classify` (Gemini 3.1 Flash Lite via
  Vertex AI, cached, ~12 min for 7,751 modules) then `uv run mathlibmap map` builds `map/index.json`
  (36 KB) and `map/area/<code>.json` (44 covered areas of 63). Totals: 322,887 declarations in 7,593
  classified modules; 199 of 1,200 famous theorems (1000+ list) in Mathlib; 1,437 open conjectures stated in
  Lean. Deepest: 18 category theory, 06 order, 20 groups. Widest gap: 37 dynamical systems (0 of 24).
  Classification agreement with the 1000+ list at the 2-digit level: 139/190 (73%), see
  `docs/msc-classification.md`. Routes: `/` (treemap, ranked table, headline) and `/area/[msc]`.

## Data sources (verified 2026-09-02)

| Key | Source | License |
|---|---|---|
| mathnetwork_* | huggingface.co/datasets/MathNetwork/MathlibGraph (v2 CSVs; `mathlib_edges.csv` is 585 MB, fetched only with `--with-edges`) | MIT |
| mathlib_types | huggingface.co/datasets/mathlib-initiative/mathlib-types (17 parquet parts + manifest) | Apache-2.0 |
| mathlib_100/1000/overview/undergrad | raw.githubusercontent.com/leanprover-community/mathlib4/master/docs/*.yaml | Apache-2.0 |
| thousand_plus | github.com/1000-plus/1000-plus.github.io tarball; `_thm/*.md` front matter has `msc_classification` and `lean.identifiers` | see repo |
| formal_conjectures | google-deepmind.github.io/formal-conjectures/data/conjectures.json (`subjects` holds AMS codes) | Apache-2.0 |
| msc2020 | msc2020.org/MSC_2020.csv (tab-separated, Latin-1 encoded) | CC BY-NC-SA |

## Deploy

- Push to `main` deploys production (GitHub repo linked to the Vercel project via the API, since
  `vercel git connect` refuses to run from the `site/` subfolder). Do not also run `vercel --prod`.
- Domains: `mathlibmap.com` (bought on Vercel 2026-09-02) and `www.mathlibmap.com` (308 redirect to apex).
- Env: `NEXT_PUBLIC_POSTHOG_KEY` (unset until launch; analytics no-ops), `NEXT_PUBLIC_DATA_BASE_URL`
  (defaults to the bucket URL in code). No secrets in the repo.

## Working preferences

Commit and push every change; keep this file and `docs/` in sync with the code. No em-dashes anywhere.
