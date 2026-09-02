"""Upload the built shards to the public bucket with long cache headers.

Uses the gcloud CLI (already authenticated on this machine) rather than a Python client, so no
extra credentials are needed. Every gcloud call sets CLOUDSDK_PYTHON to a supported interpreter.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "out"
BUCKET = "gs://mathlibmap-data"


def _gcloud_env() -> dict[str, str]:
    env = dict(os.environ)
    if "CLOUDSDK_PYTHON" not in env:
        found = subprocess.run(["uv", "python", "find", "3.12"], capture_output=True, text=True, check=True)
        env["CLOUDSDK_PYTHON"] = found.stdout.strip()
    return env


def upload(subdir: str, *, max_age: int = 3600, dry_run: bool = False) -> None:
    """Sync out/<subdir> to <bucket>/<subdir>. Cache for `max_age` seconds (1h default: a monthly
    snapshot can afford stale reads, and the snapshot tag travels inside the JSON)."""
    if shutil.which("gcloud") is None:
        raise SystemExit("gcloud CLI not found")
    src = OUT / subdir
    if not src.exists():
        raise SystemExit(f"nothing to upload at {src}")
    cmd = [
        "gcloud", "storage", "rsync", "--recursive", "--delete-unmatched-destination-objects", "--gzip-local-all",
        f"--cache-control=public, max-age={max_age}",
        "--content-type=application/json",
        str(src), f"{BUCKET}/{subdir}",
    ]
    if dry_run:
        cmd.insert(3, "--dry-run")
    print(" ".join(cmd))
    subprocess.run(cmd, check=True, env=_gcloud_env())
