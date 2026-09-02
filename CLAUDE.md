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
- **2026-09-02 · gcloud needs Python 3.12.** The system gcloud fails on Python 3.9; every gcloud call sets
  `CLOUDSDK_PYTHON=$(uv python find 3.12)`.

## Data sources (verified 2026-09-02)

| Key | Source | License |
|---|---|---|
| mathnetwork_* | huggingface.co/datasets/MathNetwork/MathlibGraph (v2 CSVs; `mathlib_edges.csv` is 585 MB, fetched only with `--with-edges`) | MIT |
| mathlib_types | huggingface.co/datasets/mathlib-initiative/mathlib-types (17 parquet parts + manifest) | Apache-2.0 |
| mathlib_100/1000/overview/undergrad | raw.githubusercontent.com/leanprover-community/mathlib4/master/docs/*.yaml | Apache-2.0 |
| thousand_plus | github.com/1000-plus/1000-plus.github.io tarball; `_thm/*.md` front matter has `msc_classification` and `lean.identifiers` | see repo |
| formal_conjectures | google-deepmind.github.io/formal-conjectures/data/conjectures.json (`subjects` holds AMS codes) | Apache-2.0 |
| msc2020 | msc2020.org/MSC_2020.csv | CC BY-NC-SA |

## Deploy

- Push to `main` deploys production (GitHub repo linked to the Vercel project via the API, since
  `vercel git connect` refuses to run from the `site/` subfolder). Do not also run `vercel --prod`.
- Domains: `mathlibmap.com` (bought on Vercel 2026-09-02) and `www.mathlibmap.com` (308 redirect to apex).
- Env: `NEXT_PUBLIC_POSTHOG_KEY` (unset until launch; analytics no-ops), `NEXT_PUBLIC_DATA_BASE_URL`
  (defaults to the bucket URL in code). No secrets in the repo.

## Working preferences

Commit and push every change; keep this file and `docs/` in sync with the code. No em-dashes anywhere.
