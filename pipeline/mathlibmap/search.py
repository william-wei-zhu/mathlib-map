"""Prefix shards for the name search.

A declaration is listed under the first two characters of every word in its name, where words are
the dotted components split again on underscores and camelCase boundaries. So
`Nat.exists_infinite_primes` lands in `na`, `ex`, `in`, and `pr`, and a query whose last word starts
with any of those finds it. Entries are `[name, kind, citedBy]`, most cited first.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "out" / "atlas"
WORD_SPLIT = re.compile(r"[._]+|(?<=[a-z0-9])(?=[A-Z])")


def search_keys(name: str) -> set[str]:
    keys = set()
    for w in WORD_SPLIT.split(name):
        w = w.lower()
        if len(w) >= 2 and re.fullmatch(r"[a-z0-9]{2}", w[:2]):
            keys.add(w[:2])
    return keys


def build_search(rank: dict[str, list]) -> int:
    shards: dict[str, list] = defaultdict(list)
    for name, entry in rank.items():
        cited, kind = entry[0], entry[1]  # entry may also carry provenCitedBy as a third element
        for k in search_keys(name):
            shards[k].append([name, kind, int(cited)])
    out = OUT / "search"
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.json"):
        old.unlink()
    for k, entries in shards.items():
        entries.sort(key=lambda x: -x[2])
        (out / f"{k}.json").write_text(json.dumps(entries, separators=(",", ":")), encoding="utf-8")
    return len(shards)


if __name__ == "__main__":
    rank = json.loads((OUT / "rank.json").read_text(encoding="utf-8"))
    print("shards:", build_search(rank))
