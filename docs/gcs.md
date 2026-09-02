# Runbook: the data bucket

**Why not Firestore.** The site reads a monthly, read-only snapshot with millions of graph edges. Graph
neighborhoods are precomputed into JSON shards, which is a file-serving problem, not a database problem.
A public bucket costs cents and needs no client SDK.

**What exists.** GCP project `mathlibmap`, billing account `william-1`. Bucket `gs://mathlibmap-data`,
region `us-central1`, uniform bucket-level access, `allUsers` granted `roles/storage.objectViewer`, CORS
allowing GET/HEAD from `https://mathlibmap.com`, `https://www.mathlibmap.com`, `http://localhost:3000`,
and `https://*.vercel.app`.

**Public URL shape.** `https://storage.googleapis.com/mathlibmap-data/<path>`. The site reads
`NEXT_PUBLIC_DATA_BASE_URL` (defaults to that prefix in `site/lib/site.ts`).

**Every gcloud call** needs a supported Python:

```bash
export CLOUDSDK_PYTHON=$(uv python find 3.12)
gcloud config set project mathlibmap
```

**Upload with cache headers** (the pipeline does this via `mathlibmap upload`, gzipped, with
`max-age=600`; the same 600 s that `fetchShard` revalidates against, so the two caches stay in step. For a
manual test):

```bash
gcloud storage cp local.json gs://mathlibmap-data/path/file.json --cache-control="public, max-age=600"
curl -sI https://storage.googleapis.com/mathlibmap-data/path/file.json | head -3
```

**Gotcha.** Right after `buckets create`, the IAM binding for `allUsers` can fail with "does not have
permission"; wait a few seconds and retry. `_health/hello.txt` is a tiny object used to check anonymous
reads.

**Scaling cliff.** Direct bucket reads are fine at the traffic of a community tool. If egress or latency
ever matters, put Cloud CDN (needs a load balancer) or a Vercel rewrite with caching in front; nothing in
the site depends on the bucket host beyond the one env var.
