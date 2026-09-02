"""Registry of every public input the pipeline reads.

Each source records where it comes from, its license (surfaced on the About page), and
how it is fetched. URLs were verified on 2026-09-02. Keep this file the single place that
knows about upstream locations.
"""

from __future__ import annotations

from dataclasses import dataclass, field

HF = "https://huggingface.co/datasets"
MATHLIB_RAW = "https://raw.githubusercontent.com/leanprover-community/mathlib4/master/docs"


@dataclass(frozen=True)
class Source:
    key: str
    title: str
    license: str
    url: str
    kind: str  # "file" | "hf-parquet-parts" | "tarball"
    note: str = ""
    files: tuple[str, ...] = field(default_factory=tuple)


SOURCES: dict[str, Source] = {
    # Declaration-level dependency graph and precomputed metrics (Feb 2026 snapshot, v4.28.0-rc1).
    "mathnetwork_decl_nodes": Source(
        key="mathnetwork_decl_nodes",
        title="MathNetwork/MathlibGraph declaration nodes",
        license="MIT",
        url=f"{HF}/MathNetwork/MathlibGraph/resolve/main/v2/declaration/nodes.csv",
        kind="file",
    ),
    "mathnetwork_decl_metrics": Source(
        key="mathnetwork_decl_metrics",
        title="MathNetwork/MathlibGraph declaration metrics (PageRank, dag_layer, is_instance, ...)",
        license="MIT",
        url=f"{HF}/MathNetwork/MathlibGraph/resolve/main/v2/declaration/metrics.csv",
        kind="file",
    ),
    "mathnetwork_edges": Source(
        key="mathnetwork_edges",
        title="MathNetwork/MathlibGraph declaration edges (8.4M rows, ~585 MB)",
        license="MIT",
        url=f"{HF}/MathNetwork/MathlibGraph/resolve/main/mathlib_edges.csv",
        kind="file",
        note="large; fetched only with --with-edges",
    ),
    "mathnetwork_module_nodes": Source(
        key="mathnetwork_module_nodes",
        title="MathNetwork/MathlibGraph module nodes",
        license="MIT",
        url=f"{HF}/MathNetwork/MathlibGraph/resolve/main/v2/module/nodes.csv",
        kind="file",
    ),
    "mathnetwork_module_edges": Source(
        key="mathnetwork_module_edges",
        title="MathNetwork/MathlibGraph module import edges",
        license="MIT",
        url=f"{HF}/MathNetwork/MathlibGraph/resolve/main/v2/module/edges.csv",
        kind="file",
    ),
    "mathnetwork_summary": Source(
        key="mathnetwork_summary",
        title="MathNetwork/MathlibGraph summary",
        license="MIT",
        url=f"{HF}/MathNetwork/MathlibGraph/resolve/main/v2/summary.json",
        kind="file",
    ),
    # Statements and docstrings for every constant (monthly, Mathlib Initiative).
    "mathlib_types": Source(
        key="mathlib_types",
        title="mathlib-initiative/mathlib-types (name, module, type, docString)",
        license="Apache-2.0",
        url=f"{HF}/mathlib-initiative/mathlib-types/resolve/main",
        kind="hf-parquet-parts",
        files=tuple(["manifest.json"] + [f"part-{i:03d}.parquet" for i in range(17)]),
    ),
    # Famous-theorem and curriculum tracking files maintained in Mathlib.
    "mathlib_100": Source("mathlib_100", "Mathlib docs/100.yaml", "Apache-2.0", f"{MATHLIB_RAW}/100.yaml", "file"),
    "mathlib_1000": Source("mathlib_1000", "Mathlib docs/1000.yaml", "Apache-2.0", f"{MATHLIB_RAW}/1000.yaml", "file"),
    "mathlib_overview": Source("mathlib_overview", "Mathlib docs/overview.yaml", "Apache-2.0", f"{MATHLIB_RAW}/overview.yaml", "file"),
    "mathlib_undergrad": Source("mathlib_undergrad", "Mathlib docs/undergrad.yaml", "Apache-2.0", f"{MATHLIB_RAW}/undergrad.yaml", "file"),
    # The 1000+ theorems project: one Markdown file per theorem with msc_classification.
    "thousand_plus": Source(
        key="thousand_plus",
        title="1000+ theorems project (_thm/*.md with msc_classification)",
        license="see repository",
        url="https://github.com/1000-plus/1000-plus.github.io/archive/refs/heads/main.tar.gz",
        kind="tarball",
    ),
    # Formal Conjectures: statements with AMS subject codes, served from the project site.
    "formal_conjectures": Source(
        key="formal_conjectures",
        title="Formal Conjectures conjectures.json (category, AMS subjects, statement)",
        license="Apache-2.0",
        url="https://google-deepmind.github.io/formal-conjectures/data/conjectures.json",
        kind="file",
    ),
    # MSC2020 classification (two levels used).
    "msc2020": Source(
        key="msc2020",
        title="MSC2020 (msc2020.org CSV)",
        license="CC BY-NC-SA",
        url="https://msc2020.org/MSC_2020.csv",
        kind="file",
    ),
}
