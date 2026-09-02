"""Upload the built shards to the public bucket, gzipped, with long cache headers.

Files are gzipped into a staging directory (same names, compressed bytes) and synced with
`Content-Encoding: gzip`, so browsers decompress transparently and the 1.5 MB hierarchy index
travels as ~250 KB. Uses the gcloud CLI (already authenticated on this machine); every gcloud call
sets CLOUDSDK_PYTHON to a supported interpreter.
"""

from __future__ import annotations

import gzip
import os
import shutil
import subprocess
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "out"
STAGE = Path(__file__).resolve().parent.parent / "cache" / "upload-stage"
BUCKET = "gs://mathlibmap-data"


def _gcloud_env() -> dict[str, str]:
    env = dict(os.environ)
    if "CLOUDSDK_PYTHON" not in env:
        found = subprocess.run(["uv", "python", "find", "3.12"], capture_output=True, text=True, check=True)
        env["CLOUDSDK_PYTHON"] = found.stdout.strip()
    return env


def _stage(subdir: str) -> Path:
    src = OUT / subdir
    if not src.exists():
        raise SystemExit(f"nothing to upload at {src}")
    dst = STAGE / subdir
    if dst.exists():
        shutil.rmtree(dst)
    n = 0
    for f in src.rglob("*"):
        if not f.is_file():
            continue
        rel = f.relative_to(src)
        target = dst / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        with f.open("rb") as fin, gzip.open(target, "wb", compresslevel=6) as fout:
            shutil.copyfileobj(fin, fout)
        n += 1
    print(f"staged {n} gzipped files at {dst}")
    return dst


def upload(subdir: str, *, max_age: int = 600, dry_run: bool = False) -> None:
    """Sync out/<subdir> (gzipped) to <bucket>/<subdir>. Cache for `max_age` seconds (10 min default:
    long enough to absorb traffic, short enough that a deploy reading a new field does not race the
    bucket's edge cache for an hour)."""
    if shutil.which("gcloud") is None:
        raise SystemExit("gcloud CLI not found")
    stage = _stage(subdir)
    cmd = [
        "gcloud", "storage", "rsync", "--recursive", "--delete-unmatched-destination-objects",
        f"--cache-control=public, max-age={max_age}",
        "--content-type=application/json",
        "--content-encoding=gzip",
        str(stage), f"{BUCKET}/{subdir}",
    ]
    if dry_run:
        cmd.insert(3, "--dry-run")
    print(" ".join(cmd))
    subprocess.run(cmd, check=True, env=_gcloud_env())
