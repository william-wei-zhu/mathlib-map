"""Print headline counts from the cached inputs, as a sanity check that fetch worked."""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
import yaml

from .fetch import CACHE


def _yaml(path: Path):
    return yaml.safe_load(path.read_text(encoding="utf-8"))


def report() -> dict[str, int]:
    counts: dict[str, int] = {}

    nodes = pd.read_csv(CACHE / "mathnetwork_decl_nodes" / "nodes.csv")
    counts["declarations"] = len(nodes)
    counts["theorems"] = int((nodes["kind"] == "theorem").sum())

    metrics = pd.read_csv(
        CACHE / "mathnetwork_decl_metrics" / "metrics.csv",
        usecols=["name", "is_instance", "instance_class", "pagerank"],
    )
    counts["instances"] = int(metrics["is_instance"].fillna(False).astype(bool).sum())
    counts["instance_classes"] = int(metrics["instance_class"].dropna().nunique())

    modules = pd.read_csv(CACHE / "mathnetwork_module_nodes" / "nodes.csv")
    counts["modules"] = len(modules)

    types_dir = CACHE / "mathlib_types"
    parts = sorted(types_dir.glob("part-*.parquet"))
    counts["typed_constants"] = int(sum(pd.read_parquet(p, columns=["name"]).shape[0] for p in parts))
    manifest = json.loads((types_dir / "manifest.json").read_text())
    counts["mathlib_types_parts"] = len(parts)
    print("mathlib-types manifest:", {k: manifest[k] for k in list(manifest)[:6]})

    hundred = _yaml(CACHE / "mathlib_100" / "100.yaml")
    counts["hundred_entries"] = len(hundred)
    counts["hundred_with_decl"] = sum(1 for v in hundred.values() if v.get("decl") or v.get("decls"))
    thousand = _yaml(CACHE / "mathlib_1000" / "1000.yaml")
    counts["thousand_entries_in_mathlib_yaml"] = len(thousand)
    counts["thousand_with_decl"] = sum(1 for v in thousand.values() if v.get("decl") or v.get("decls"))

    thm_dir = next((CACHE / "thousand_plus" / "extracted").glob("*/_thm"))
    thm_files = list(thm_dir.glob("*.md"))
    counts["thousand_plus_theorems"] = len(thm_files)
    with_msc = 0
    for f in thm_files:
        text = f.read_text(encoding="utf-8")
        body = text.split("---", 2)[1] if text.startswith("---") else text
        data = yaml.safe_load(body) or {}
        if data.get("msc_classification") is not None:
            with_msc += 1
    counts["thousand_plus_with_msc"] = with_msc

    fc = json.loads((CACHE / "formal_conjectures" / "conjectures.json").read_text(encoding="utf-8"))
    counts["formal_conjectures"] = len(fc)
    counts["formal_conjectures_with_subjects"] = sum(1 for c in fc if c.get("subjects"))

    msc = pd.read_csv(CACHE / "msc2020" / "MSC_2020.csv", dtype=str, header=None, on_bad_lines="skip")
    counts["msc2020_rows"] = len(msc)

    for k, v in counts.items():
        print(f"{k:40s} {v:>10,}")
    return counts


if __name__ == "__main__":
    report()
