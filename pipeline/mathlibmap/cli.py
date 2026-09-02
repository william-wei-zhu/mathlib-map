"""Command-line entry point: `uv run mathlibmap <command>`."""

from __future__ import annotations

import argparse


def main() -> None:
    parser = argparse.ArgumentParser(prog="mathlibmap", description="Mathlib Map pipeline")
    sub = parser.add_subparsers(dest="command", required=True)
    f = sub.add_parser("fetch", help="download all inputs into pipeline/cache")
    f.add_argument("--with-edges", action="store_true", help="also fetch the 585 MB edge list")
    sub.add_parser("report", help="print headline counts from the cache")
    args = parser.parse_args()

    if args.command == "fetch":
        from .fetch import fetch_all

        fetch_all(with_edges=args.with_edges)
    elif args.command == "report":
        from .report import report

        report()
