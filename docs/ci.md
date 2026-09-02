# Runbook: the monthly refresh

`.github/workflows/monthly.yml` rebuilds every shard from the pinned Mathlib tag and uploads it. It runs on
the 3rd of each month at 06:00 UTC (no daylight-saving shift; it is UTC) and on demand from the Actions tab.

**Dispatch inputs.** `dry_run` (default true) builds everything and skips the upload; `mathlib_tag` rewrites
`extractor/lakefile.toml`, `extractor/lean-toolchain`, and `data/curated/snapshot.yaml` for that run only.
To move the site to a new Mathlib release for good, change those three files in a commit.

**Credentials.** One repository secret, `GCP_SA_KEY`: the JSON key of
`mathlibmap-ci@mathlibmap.iam.gserviceaccount.com`, which has `roles/storage.objectAdmin` on the bucket and
`roles/aiplatform.user` on project `mathlibmap`. Nothing else. Rotate with
`gcloud iam service-accounts keys create` and `gh secret set GCP_SA_KEY < key.json`, then delete the local
file.

**Steps.** lean-action installs elan and Mathlib's compiled cache; the extractor runs twice (records, then
dependencies); `classify` reuses `pipeline/cache/msc` restored by actions/cache, so only changed files hit the
model; then hierarchy, atlas, map (hierarchy and map run again so they pick up the citation ranks); pytest;
upload hierarchy, map, atlas, downloads, root.

**Budget.** About 60 to 90 minutes on a hosted runner; the dependency extraction needs ~7 GB of RAM, which
`ubuntu-latest` provides. If a run is killed for memory, the fallback is a Cloud Run job or a local run
(`docs/pipeline.md`).

**What is not automated.** The Zulip post, bumping the Mathlib tag, and the snapshot diff (needs two
snapshots; first possible after the second monthly run).
