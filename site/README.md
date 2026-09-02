# Mathlib Map — site

The Next.js 16 (App Router) frontend for [mathlibmap.com](https://mathlibmap.com): one persistent,
pan/zoom map of Mathlib with every route rendered in a side panel. Data is read at request time from
a public GCS bucket (no database). See the repo root `CLAUDE.md` for the full architecture and the
decision log, and `../docs/` for per-integration runbooks.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
npm run lint
```

Environment (both optional locally; see `.env.example`):

- `NEXT_PUBLIC_DATA_BASE_URL` — data bucket base URL (defaults to the production bucket in `lib/site.ts`).
- `NEXT_PUBLIC_POSTHOG_KEY` — analytics; a no-op when unset.

## Deploy

Vercel project `mathlib-map` with **Root Directory = `site`**. Push to `main` deploys production.
