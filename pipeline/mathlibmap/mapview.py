"""Build the Map view: every MSC2020 area with how much of Mathlib lives there and how much of
the famous mathematics in that area is formalized.

Inputs: out/msc/modules.json (classification), the 1000+ theorems files, docs/100.yaml, the
Formal Conjectures JSON, docs/undergrad.yaml with data/curated/undergrad-msc.yaml, and the
hierarchy index (for "structures defined here").
Outputs (pipeline/out/map/): index.json (all areas, for the treemap and the ranked table) and
area/<code>.json (one page per area). Every ratio ships with its denominator.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import yaml

from .fetch import CACHE
from .msc import load_msc

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out" / "map"
CURATED = ROOT.parent / "data" / "curated"

MATHLIB_DOCS = "https://leanprover-community.github.io/mathlib4_docs"


def _yaml(p: Path):
    return yaml.safe_load(p.read_text(encoding="utf-8"))


def _norm2(code) -> str:
    return str(code).strip().zfill(2)[:2]


def load_thousand_plus() -> list[dict]:
    thm_dir = next((CACHE / "thousand_plus" / "extracted").glob("*/_thm"))
    out = []
    for f in sorted(thm_dir.glob("*.md")):
        text = f.read_text(encoding="utf-8")
        parts = text.split("---", 2)
        body = parts[1] if len(parts) > 1 else text
        data = yaml.safe_load(body) or {}
        title_m = re.search(r"^#\s*(.+)$", body, re.M)
        lean = data.get("lean") or []
        mathlib = any(e.get("status") == "formalized" and e.get("library") == "L" for e in lean)
        anylean = any(e.get("status") == "formalized" for e in lean)
        idents = [i for e in lean for i in (e.get("identifiers") or [])]
        out.append({
            "wikidata": str(data.get("wikidata", f.stem)) + str(data.get("id_suffix", "") or ""),
            "title": title_m.group(1).strip() if title_m else f.stem,
            "msc": _norm2(data.get("msc_classification", "")),
            "mathlib": mathlib,
            "lean": anylean,
            "decls": idents[:4],
            "url": f"https://1000-plus.github.io/?length=-1#{data.get('wikidata', f.stem)}",
        })
    return out


def decl_module_map(ndjson: Path) -> dict[str, str]:
    m = {}
    with ndjson.open(encoding="utf-8") as f:
        for line in f:
            r = json.loads(line)
            if r["kind"] == "decl":
                m[r["name"]] = r.get("module") or ""
    return m


def build(snapshot: dict | None = None) -> dict:
    areas_lbl, sub_lbl = load_msc()
    cls = json.loads((ROOT / "out" / "msc" / "modules.json").read_text(encoding="utf-8"))["modules"]
    decl_mod = decl_module_map(CACHE / "extract" / "mathlib.ndjson")

    def area_of_module(m: str) -> str | None:
        rec = cls.get(m)
        if not rec:
            return None
        p = rec["primary"]
        return None if p in ("NONE", "UNKNOWN") else p[:2]

    # ---- module aggregates
    area_mods: dict[str, list[dict]] = defaultdict(list)
    sub_agg: dict[str, Counter] = defaultdict(Counter)
    for m, rec in cls.items():
        a = area_of_module(m)
        if a is None:
            continue
        n = rec["theorems"] + rec["definitions"]
        area_mods[a].append({
            "module": m, "primary": rec["primary"], "title": rec.get("title", ""),
            "theorems": rec["theorems"], "definitions": rec["definitions"], "declarations": n,
            "confidence": rec.get("confidence", 0), "source": rec.get("source", "model"),
        })
        s = rec["primary"] if len(rec["primary"]) == 3 else None
        if s:
            sub_agg[s]["declarations"] += n
            sub_agg[s]["theorems"] += rec["theorems"]
            sub_agg[s]["modules"] += 1

    # ---- famous theorems (1000+)
    famous = load_thousand_plus()
    famous_by_area: dict[str, list[dict]] = defaultdict(list)
    for t in famous:
        famous_by_area[t["msc"]].append(t)
    # agreement between the model's area for a theorem's module and the 1000+ area
    agree = total = 0
    for t in famous:
        if not t["mathlib"]:
            continue
        for d in t["decls"]:
            mod = decl_mod.get(d)
            a = area_of_module(mod) if mod else None
            if a:
                total += 1
                agree += a == t["msc"]
                break

    # ---- 100 theorems
    hundred = _yaml(CACHE / "mathlib_100" / "100.yaml")
    hundred_by_area: dict[str, list[dict]] = defaultdict(list)
    for num, e in hundred.items():
        decls = [e["decl"]] if e.get("decl") else list(e.get("decls") or [])
        mod = next((decl_mod.get(d) for d in decls if decl_mod.get(d)), None)
        a = area_of_module(mod) if mod else None
        if a:
            hundred_by_area[a].append({"number": int(num), "title": e.get("title", ""), "decl": decls[0], "module": mod})

    # ---- Formal Conjectures
    fc = json.loads((CACHE / "formal_conjectures" / "conjectures.json").read_text(encoding="utf-8"))["conjectures"]
    conj_by_area: dict[str, list[dict]] = defaultdict(list)
    for c in fc:
        cat = c.get("category")
        if cat not in ("research open", "research solved"):
            continue
        for s in c.get("subjects") or []:
            code = _norm2(s.get("code", ""))
            conj_by_area[code].append({
                "name": c.get("displayTheorem") or c.get("theorem"),
                "category": "open" if cat == "research open" else "solved",
                "collection": c.get("collection"),
                "url": c.get("githubUrl"),
            })

    # ---- undergrad gaps
    ug = _yaml(CACHE / "mathlib_undergrad" / "undergrad.yaml")
    ug_map = _yaml(CURATED / "undergrad-msc.yaml")
    ug_by_area: dict[str, list[dict]] = defaultdict(list)

    def walk(d, path: list[str], acc: list[dict]):
        for k, v in d.items():
            if isinstance(v, dict):
                walk(v, path + [str(k)], acc)
            else:
                acc.append({"topic": " › ".join(path[1:] + [str(k)]), "decl": None if (not v or str(v).startswith("http")) else str(v)})

    for chapter, body in ug.items():
        topics: list[dict] = []
        walk(body, [chapter], topics)
        code = _norm2(ug_map.get(chapter, "")) if ug_map.get(chapter) else None
        if code:
            ug_by_area[code].append({
                "chapter": chapter, "total": len(topics), "missing": sum(1 for t in topics if t["decl"] is None),
                "missingTopics": [t["topic"] for t in topics if t["decl"] is None],
            })

    # ---- structures per area
    hier = json.loads((ROOT / "out" / "hierarchy" / "index.json").read_text(encoding="utf-8"))
    classes_by_area: dict[str, list[dict]] = defaultdict(list)
    for c in hier["classes"]:
        a = area_of_module(c.get("module") or "")
        if a and not c.get("hidden"):
            classes_by_area[a].append({"id": c["id"], "assumedBy": c["assumedBy"], "instances": c["instances"]})

    # ---- assemble
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "area").mkdir(exist_ok=True)
    index_areas = []
    for code in sorted(areas_lbl):
        mods = sorted(area_mods.get(code, []), key=lambda x: -x["declarations"])
        fam = famous_by_area.get(code, [])
        conj = conj_by_area.get(code, [])
        ug_ch = ug_by_area.get(code, [])
        subareas = [
            {"code": s, "label": sub_lbl[s], **sub_agg[s]}
            for s in sorted(sub_lbl) if s.startswith(code) and sub_agg.get(s)
        ]
        subareas.sort(key=lambda x: -x["declarations"])
        entry = {
            "code": code,
            "label": areas_lbl[code],
            "declarations": sum(m["declarations"] for m in mods),
            "theorems": sum(m["theorems"] for m in mods),
            "definitions": sum(m["definitions"] for m in mods),
            "modules": len(mods),
            "famous_total": len(fam),
            "famous_mathlib": sum(1 for t in fam if t["mathlib"]),
            "famous_lean": sum(1 for t in fam if t["lean"]),
            "conjectures_open": sum(1 for c in conj if c["category"] == "open"),
            "conjectures_solved": sum(1 for c in conj if c["category"] == "solved"),
            "undergrad_total": sum(c["total"] for c in ug_ch),
            "undergrad_missing": sum(c["missing"] for c in ug_ch),
            "hundred": len(hundred_by_area.get(code, [])),
        }
        index_areas.append({**entry, "subareas": [{k: v for k, v in s.items() if k != "theorems"} for s in subareas[:12]]})
        page = {
            **entry,
            "subareas": subareas,
            "modules": mods,
            "famous": sorted(fam, key=lambda t: (t["mathlib"], t["lean"], t["title"])),
            "hundred": sorted(hundred_by_area.get(code, []), key=lambda x: x["number"]),
            "conjectures": sorted(conj, key=lambda c: (c["category"] != "open", c["name"]))[:400],
            "undergrad": ug_ch,
            "classes": sorted(classes_by_area.get(code, []), key=lambda c: -c["assumedBy"])[:24],
        }
        (OUT / "area" / f"{code}.json").write_text(json.dumps(page, separators=(",", ":")), encoding="utf-8")

    covered = [a for a in index_areas if a["declarations"] > 0]
    deepest = sorted(covered, key=lambda a: -a["declarations"])[:3]
    gap_candidates = [a for a in covered if a["famous_total"] >= 20]
    widest_gap = min(gap_candidates, key=lambda a: a["famous_mathlib"] / a["famous_total"]) if gap_candidates else None
    totals = {
        "declarations": sum(a["declarations"] for a in index_areas),
        "theorems": sum(a["theorems"] for a in index_areas),
        "definitions": sum(a["definitions"] for a in index_areas),
        "modules": sum(a["modules"] for a in index_areas),
        "areas_total": len(index_areas),
        "areas_covered": len(covered),
        "famous_total": len(famous),
        "famous_mathlib": sum(1 for t in famous if t["mathlib"]),
        "famous_lean": sum(1 for t in famous if t["lean"]),
        "conjectures_open": sum(a["conjectures_open"] for a in index_areas),
        "conjectures_solved": sum(a["conjectures_solved"] for a in index_areas),
        "undergrad_total": sum(a["undergrad_total"] for a in index_areas),
        "undergrad_missing": sum(a["undergrad_missing"] for a in index_areas),
        "classification_agreement": {"agree": agree, "total": total},
    }
    index = {
        "snapshot": snapshot or {},
        "totals": totals,
        "headline": {
            "deepest": [a["code"] for a in deepest],
            "widestGap": widest_gap["code"] if widest_gap else None,
        },
        "areas": index_areas,
    }
    (OUT / "index.json").write_text(json.dumps(index, separators=(",", ":")), encoding="utf-8")
    summary = {**totals, "index_bytes": (OUT / "index.json").stat().st_size, "deepest": [(a["code"], a["label"], a["declarations"]) for a in deepest], "widest_gap": (widest_gap["code"], widest_gap["label"], widest_gap["famous_mathlib"], widest_gap["famous_total"]) if widest_gap else None}
    return summary


if __name__ == "__main__":
    print(json.dumps(build(), indent=1))
