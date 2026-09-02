"""Command-line entry point: `uv run mathlibmap <command>`."""

from __future__ import annotations

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(prog="mathlibmap", description="Mathlib Map pipeline")
    sub = parser.add_subparsers(dest="command", required=True)
    f = sub.add_parser("fetch", help="download all inputs into pipeline/cache")
    f.add_argument("--with-edges", action="store_true", help="also fetch the 585 MB edge list")
    sub.add_parser("report", help="print headline counts from the cache")
    h = sub.add_parser("hierarchy", help="build the Structures view data from the extractor output")
    h.add_argument("--src", default=None, help="extractor NDJSON (default: cache/extract/mathlib.ndjson)")
    up = sub.add_parser("upload", help="rsync an out/ subdirectory to the public bucket")
    up.add_argument("subdir", help="e.g. hierarchy")
    up.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.command == "fetch":
        from .fetch import fetch_all

        fetch_all(with_edges=args.with_edges)
    elif args.command == "report":
        from .report import report

        report()
    elif args.command == "hierarchy":
        import json
        from pathlib import Path

        from .hierarchy import build

        src = Path(args.src) if args.src else Path(__file__).resolve().parent.parent / "cache" / "extract" / "mathlib.ndjson"
        print(json.dumps(build(src), indent=1))
    elif args.command == "upload":
        from .upload import upload

        upload(args.subdir, dry_run=args.dry_run)
