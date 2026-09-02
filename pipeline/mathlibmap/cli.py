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
    cl = sub.add_parser("classify", help="classify Mathlib modules into MSC2020 areas with Gemini (cached)")
    cl.add_argument("--limit", type=int, default=None, help="only classify this many uncached modules (for a test run)")
    sub.add_parser("map", help="build the Map view data (areas, coverage, overlays) from the classification")
    sub.add_parser("atlas", help="build the Theorems view data (spine graph, ranks, node and search shards)")
    sub.add_parser("search", help="rebuild the name-search shards from out/atlas/rank.json")
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
    elif args.command == "classify":
        from pathlib import Path

        from .fetch import CACHE
        from .msc import classify_all

        classify_all(CACHE / "extract" / "mathlib.ndjson", limit=args.limit)
    elif args.command == "map":
        import json

        from .mapview import build as build_map

        print(json.dumps(build_map(), indent=1))
    elif args.command == "atlas":
        import json

        from .atlas import build as build_atlas

        print(json.dumps(build_atlas(), indent=1))
    elif args.command == "search":
        import json
        from pathlib import Path

        from .search import OUT as ATLAS_OUT, build_search

        rank = json.loads((ATLAS_OUT / "rank.json").read_text(encoding="utf-8"))
        print("shards:", build_search(rank))
    elif args.command == "upload":
        from .upload import upload

        upload(args.subdir, dry_run=args.dry_run)
