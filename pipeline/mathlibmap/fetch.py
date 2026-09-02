"""Download every registered source into the local cache (idempotent, resumable)."""

from __future__ import annotations

import json
import sys
import tarfile
from pathlib import Path

import requests

from .sources import SOURCES, Source

CACHE = Path(__file__).resolve().parent.parent / "cache"
CHUNK = 1 << 20


def _download(url: str, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    tmp = dest.with_suffix(dest.suffix + ".part")
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with tmp.open("wb") as f:
            for chunk in r.iter_content(CHUNK):
                f.write(chunk)
    tmp.rename(dest)
    return dest


def fetch_source(src: Source, *, with_edges: bool = False) -> list[Path]:
    out_dir = CACHE / src.key
    if src.kind == "file":
        if src.key == "mathnetwork_edges" and not with_edges:
            return []
        return [_download(src.url, out_dir / Path(src.url).name)]
    if src.kind == "hf-parquet-parts":
        manifest = _download(f"{src.url}/manifest.json", out_dir / "manifest.json")
        listed = json.loads(manifest.read_text())["files"]
        parts = [e["relativePath"] for e in listed if e["relativePath"].endswith(".parquet")]
        return [manifest] + [_download(f"{src.url}/{name}", out_dir / name) for name in parts]
    if src.kind == "tarball":
        tar_path = _download(src.url, out_dir / "source.tar.gz")
        extracted = out_dir / "extracted"
        if not extracted.exists():
            with tarfile.open(tar_path) as tf:
                tf.extractall(extracted, filter="data")
        return [tar_path]
    raise ValueError(f"unknown source kind {src.kind}")


def fetch_all(*, with_edges: bool = False) -> dict[str, list[Path]]:
    got: dict[str, list[Path]] = {}
    for key, src in SOURCES.items():
        print(f"fetch {key} ...", end=" ", flush=True)
        paths = fetch_source(src, with_edges=with_edges)
        size = sum(p.stat().st_size for p in paths)
        print(f"{len(paths)} file(s), {size / 1e6:.1f} MB")
        got[key] = paths
    (CACHE / "manifest.json").write_text(
        json.dumps({k: [str(p) for p in v] for k, v in got.items()}, indent=2)
    )
    return got


if __name__ == "__main__":
    fetch_all(with_edges="--with-edges" in sys.argv)
