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
- `extractor/`: Lean 4 Lake project that walks the Mathlib environment (records mode for Structures and
  Map, deps mode for Theorems).
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
- **2026-09-02 · Stale shards after an upload: two caches.** Next's server-side data cache keeps a fetched
  shard for `revalidate` seconds (now 600 in `fetchShard`), and the bucket's edge cache honors the object's
  `Cache-Control` (now `max-age=600` in `upload.py`). A deploy that required a brand-new field failed once
  (`short` missing at build) and an area page 500'd once (`files` missing). Rule: UI code tolerates missing
  or renamed fields (`shortName()`, the `modules`-array fallback in the area loader), and data is uploaded
  before the code that reads it is pushed.
- **2026-09-02 · Area page JSON uses `files` for the file list and `modules` for the count.** They briefly
  shared the key `modules` and the lead sentence rendered "[object Object]".
- **2026-09-02 · Tour anchored on Bertrand's postulate, not the Prime Number Theorem.** Mathlib v4.33.0 has
  Chebyshev's bounds on π(x) but the PNT itself lives in the external PNT+ project, so the first tour descends
  from `Nat.bertrand` (a complete, famous, in-Mathlib chain). Tours are data in `site/lib/tours.ts`; every
  name in a tour must exist in the extraction.
- **2026-09-02 · Depth is computed on the SCC condensation.** The first run hit the iteration cap (400)
  because Lean's environment has reference cycles; condensing first gives a true longest path (max 361).
- **2026-09-02 · gcloud needs Python 3.12.** The system gcloud fails on Python 3.9; every gcloud call sets
  `CLOUDSDK_PYTHON=$(uv python find 3.12)`.
- **2026-09-02 · Atlas redesign (branch `atlas-redesign`).** Approved plan
  `~/.claude/plans/act-like-a-world-snug-quail.md`: fold the three view silos into one explorable map
  (Full canvas SPA, panels not pages). North star: wow through clarity, a real useful map, no hairball
  (`[[feedback_mathlibmap_north_star]]`). Name stays "Mathlib Map"; "Atlas" is the internal codename.
  Theorem layer will be a WebGL galaxy backdrop with an SVG focus+context working mode (a sanctioned
  new exception to "SVG only"; still 2D). First slice done: the World map.
  `pipeline/mathlibmap/embed.py` computes a 2D spatial embedding of the MSC areas from cross-area
  citation counts (spectral seed + weighted Fruchterman-Reingold + per-axis fill-stretch + collision),
  writing `area["pos"]=[x,y]` into `map/index.json` (viewBox 1200x760; radius
  `sqrt(size/maxsize)*80+20`, matched in the site). Called from `mapview.build` (optional; falls back
  if the extractor cache is absent). The World map is `site/components/atlas/atlas-canvas.tsx` (organic
  region blobs with contours, d3-zoom pan/zoom with wheel-zoom disabled so page scroll works,
  click-to-zoom, coverage/conjecture shading, subarea labels only on the selected region), a full-bleed
  hero on `/` with the ranked table kept below as the fallback. `frontier-map.tsx` is retained until the
  SPA shell lands. `data/index.json` needs `mathlibmap upload map` (or re-run embed) before the deployed
  site shows positions; `pos` is backward-compatible and ignored by the old treemap.
- **2026-09-02 · Atlas redesign phase 2: Google-Maps shell.** The whole site is now one persistent
  full-screen map with a left collapsible, drag-resizable sidebar holding every route, a floating
  top search box, a floating Layers control, and a redesigned node-constellation logo. Structure:
  `app/layout.tsx` (now async, fetches `map/index.json`) renders `<AtlasShell mapIndex>` instead of
  header/main/footer; `components/atlas/atlas-shell.tsx` mounts the persistent `<AtlasCanvas>` once
  (so pan/zoom survives navigation), places logo + `search-box.tsx` top-left, renders each route's
  `children` in the left `<Sidebar>` (collapsed on `/`, open on content routes; width remembered in
  `localStorage["atlas.sidebarW"]`, 300-720px), and floats `layers-control.tsx` + `info-menu.tsx`
  top-right. No parallel/intercepting routes needed: the map lives in the layout, every route (soft
  or hard load) shows map + sidebar, deep links stay server-rendered. The map reacts to the route
  (`/area/NN` -> fly + highlight) and region clicks `router.push` to the area. `AtlasCanvas` is now
  controlled (`metric`, `focusCode`, `onPick`); its color/legend/banner moved to the shell.
  `search-box.tsx` unifies areas (`map/index.json`) + structures (`hierarchy/index.json`) +
  theorems (`atlas/search/*` prefix shards). Logo redesigned in `components/logo.tsx` +
  `lib/logo-og.tsx` (constellation, one terracotta focal node); raster icon/OG routes unchanged.
  `header.tsx`/`footer.tsx`/`nav-links.tsx` pills and `frontier-map.tsx` are now unused (About/
  Privacy/Settings live in the info menu). Product name stays "Mathlib Map".
- **2026-09-02 · Atlas redesign phase 3: Region altitude + decl fly-to.** The shell resolves the
  map focus from the route in an effect: `/area/NN` sets `focusCode` and fetches that area's
  landmark declarations (`map/area/NN.json` `topResults`, top 8); `/decl/NAME` fetches the node
  shard (`atlas/nodes/...`) for its `area.code`, flies there, and marks the node active. `AtlasCanvas`
  gained `landmarks`, `activeNode`, `onNode`; when an area is focused it hides the region name and
  draws the landmark declarations as accent nodes (sized by citations, sized in screen units via
  `/scale`) in a spiral inside the blob, labeled by last name segment, click routes to `/decl`. Map
  polish: `embed.py` now adds a gravity term + isotropic fit (no stranded areas); region labels wrap
  instead of truncating.
- **2026-09-02 · Atlas redesign phase 4 (working mode): theorem focus+context graph.**
  `components/atlas/theorem-graph.tsx` draws a declaration's dependency neighbourhood over the
  (faint, scrimmed) map when on `/decl`: the current node centred, what it cites below, what cites
  it above, dashed edges for statement dependencies and solid for proof citations, nodes sized by
  citations and clickable to re-centre (walk the graph). The shell fetches the node shard's
  `uses`/`usedBy` into `nodeData` and renders the overlay; on `/decl` the area's landmark nodes and
  title are suppressed so the graph is the focus with the region as a plain backdrop. This is the
  "SVG focus+context working mode" half of the theorem layer; the WebGL galaxy backdrop of all
  ~300k nodes (needs the offline `atlas/layout.bin` layout step) is still to come.

## Status

- **2026-09-02 · Atlas redesign shipped to production.** The Google-Maps interface is live on
  mathlibmap.com: one persistent map, a left collapsible drag-resizable sidebar holding every route,
  a top search box (areas + structures + theorems), a floating Layers control, the node-constellation
  logo, and the World -> Region -> Theorem altitudes plus the Structures layer. Built on branch
  `atlas-redesign`, merged to `main`. The map's spatial positions were uploaded to the bucket
  (`mathlibmap upload map`, backward-compatible `pos` field). Still pending: the WebGL galaxy backdrop
  of all ~300k nodes. `frontier-map.tsx`, `header.tsx`, `footer.tsx`, and `nav-links.tsx` remain in
  the tree but are unused by the shell.
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

- **2026-09-02 · Phase 3 (Theorems) first cut live.** `lake exe extractor --mode deps` (771,129 constants,
  80 s) then `uv run mathlibmap atlas`: 300,710 spine declarations, 3.18M filtered edges, axioms and depth
  over the full graph (see `docs/atlas.md`). Routes: `/decl/[name]` (statement, docstring, cites and cited-by
  ranked by citations, star, foundations), `/search` (client-side prefix shards, Loogle deep link),
  `/tour/bertrand` (eleven verified steps from `Nat.bertrand` to `Nat.Prime`). Area pages gained "most cited
  results" and class pages sort "assumed by" by citations (`rank.json`). Not built yet: the `/api/graph`
  closure and path endpoints; transitive definition counts exist for the 3,000 most cited nodes only.

- **2026-09-02 · Phase 4 (launch polish) done except the human steps.** Hidden `/docs` walk-through (noindex,
  unlinked, hand-built SVG, one-shot reveals), downloads under `downloads/<tag>/` with a README and licenses
  (About page links them), root `meta.json` read by the footer (`getSnapshot()` with a constant fallback),
  PostHog events (`search_typed`, `map_area_zoomed`, `map_color_changed`, `hierarchy_focused`,
  `hierarchy_type_lit`, `path_asked`; no-ops until `NEXT_PUBLIC_POSTHOG_KEY` is set), monthly GitHub Actions
  refresh with a dry-run switch and a scoped service account (`docs/ci.md`), announcement drafts in
  `docs/announcements.md`. Human steps left: set the PostHog key in Vercel, run the workflow once with
  dry_run, post to Zulip.

## Data sources (verified 2026-09-02)

| Key | Source | License |
|---|---|---|
| mathnetwork_* | huggingface.co/datasets/MathNetwork/MathlibGraph (v2 CSVs; `mathlib_edges.csv` is 585 MB, fetched only with `--with-edges`) | MIT |
| mathlib_types | huggingface.co/datasets/mathlib-initiative/mathlib-types (128 parquet parts + manifest) | Apache-2.0 |
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
