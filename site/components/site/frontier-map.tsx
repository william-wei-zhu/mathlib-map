"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { hierarchy, treemap, treemapSquarify, type HierarchyRectangularNode } from "d3-hierarchy";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import "d3-transition";
import { Minus, Plus, Scan } from "lucide-react";
import { areaHref, coverage, fmt, pct, type AreaSummary, type MapIndex } from "@/lib/map-data";
import { RAMP, fillFor, rampStep, textOn } from "@/lib/ramp";
import { cn } from "@/lib/utils";

const W = 1200;
const H = 720;

type Metric = "coverage" | "conjectures";

type Node = { kind: "area"; area: AreaSummary } | { kind: "sub"; area: AreaSummary; code: string; label: string } | { kind: "rest"; area: AreaSummary };
type Datum = { name: string; value?: number; node: Node; children?: Datum[] };

function metricValue(a: AreaSummary, metric: Metric, maxConj: number): number | null {
  if (metric === "coverage") return coverage(a);
  return maxConj > 0 ? Math.sqrt(a.conjectures_open / maxConj) : null;
}

function truncate(label: string, maxChars: number): string {
  return label.length <= maxChars ? label : label.slice(0, Math.max(1, maxChars - 1)) + "…";
}

export function FrontierMap({ index }: { index: MapIndex }) {
  const { resolvedTheme } = useTheme();
  const mode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";
  const [metric, setMetric] = useState<Metric>("coverage");
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ area: AreaSummary; x: number; y: number; w: number } | null>(null);
  const [scale, setScale] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const areas = useMemo(() => index.areas.filter((a) => a.declarations > 0), [index]);
  const maxConj = useMemo(() => Math.max(0, ...areas.map((a) => a.conjectures_open)), [areas]);

  const root = useMemo(() => {
    const data: Datum = {
      name: "root",
      node: { kind: "rest", area: areas[0] },
      children: areas.map((a) => {
        const subs = a.subareas.filter((s) => s.declarations > 0);
        const rest = a.declarations - subs.reduce((n, s) => n + s.declarations, 0);
        const children: Datum[] = subs.map((s) => ({ name: s.code, value: s.declarations, node: { kind: "sub", area: a, code: s.code, label: s.label } }));
        if (rest > 0) children.push({ name: `${a.code}-rest`, value: rest, node: { kind: "rest", area: a } });
        return { name: a.code, node: { kind: "area", area: a }, children };
      }),
    };
    const h = hierarchy<Datum>(data).sum((d) => d.value ?? 0).sort((x, y) => (y.value ?? 0) - (x.value ?? 0));
    return treemap<Datum>().tile(treemapSquarify).size([W, H]).paddingOuter(3).paddingTop(0).paddingInner(2).round(true)(h);
  }, [areas]);

  const areaNodes = root.children ?? [];

  useEffect(() => {
    const svgEl = svgRef.current;
    const gEl = gRef.current;
    if (!svgEl || !gEl) return;
    const g = select(gEl);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [W, H]])
      .on("zoom", (ev) => {
        g.attr("transform", ev.transform.toString());
        setScale(ev.transform.k);
      });
    const sel = select(svgEl);
    sel.call(z);
    zoomRef.current = z;
    return () => {
      sel.on(".zoom", null);
      zoomRef.current = null;
    };
  }, []);

  const zoomToNode = (n: HierarchyRectangularNode<Datum>) => {
    const svgEl = svgRef.current;
    const z = zoomRef.current;
    if (!svgEl || !z) return;
    const w = n.x1 - n.x0;
    const h = n.y1 - n.y0;
    const k = Math.min(8, 0.9 / Math.max(w / W, h / H));
    const tx = W / 2 - k * (n.x0 + w / 2);
    const ty = H / 2 - k * (n.y0 + h / 2);
    select(svgEl).transition().duration(450).call(z.transform, zoomIdentity.translate(tx, ty).scale(k));
  };
  const reset = () => {
    const svgEl = svgRef.current;
    const z = zoomRef.current;
    if (!svgEl || !z) return;
    select(svgEl).transition().duration(350).call(z.transform, zoomIdentity);
    setSelected(null);
  };
  const zoomBy = (f: number) => {
    const svgEl = svgRef.current;
    const z = zoomRef.current;
    if (!svgEl || !z) return;
    select(svgEl).transition().duration(200).call(z.scaleBy, f);
  };

  const selectedArea = selected ? areas.find((a) => a.code === selected) ?? null : null;
  const showSub = scale >= 2.2;
  const btn = "inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/50 bg-background text-foreground transition-colors hover:border-foreground";
  const toggle = (active: boolean) =>
    cn("eyebrow inline-flex h-10 items-center rounded-full border px-3.5 transition-colors", active ? "border-foreground bg-foreground text-background" : "border-foreground/40 text-foreground hover:border-foreground");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Color the map by">
          <span className="eyebrow text-muted-foreground">Color by</span>
          <button type="button" className={toggle(metric === "coverage")} onClick={() => setMetric("coverage")}>Famous theorems formalized</button>
          <button type="button" className={toggle(metric === "conjectures")} onClick={() => setMetric("conjectures")}>Open conjectures stated</button>
        </div>
        <p className="eyebrow text-muted-foreground">Size: declarations in Mathlib</p>
      </div>

      <div className="relative mt-4 hidden sm:block">
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoom in" title="Zoom in" className={btn}><Plus className="h-5 w-5" /></button>
          <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out" title="Zoom out" className={btn}><Minus className="h-5 w-5" /></button>
          <button type="button" onClick={reset} aria-label="Reset view" title="Reset view" className={btn}><Scan className="h-5 w-5" /></button>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block w-full touch-none rounded-lg border border-border bg-card"
          role="img"
          aria-label="Treemap of mathematics areas sized by Mathlib declarations"
          onMouseLeave={() => setHover(null)}
        >
          <g ref={gRef}>
            {areaNodes.map((n) => {
              const a = (n.data.node as { area: AreaSummary }).area;
              const step = rampStep(metricValue(a, metric, maxConj));
              const fill = fillFor(step, mode);
              const ink = textOn(step, mode);
              const w = n.x1 - n.x0;
              const h = n.y1 - n.y0;
              const isSel = selected === a.code;
              const fontSize = 15 / Math.max(1, scale * 0.85);
              const maxChars = Math.floor((w - 12) / (fontSize * 0.55));
              return (
                <g
                  key={a.code}
                  role="button"
                  tabIndex={0}
                  aria-label={`${a.code} ${a.label}: ${fmt(a.declarations)} declarations`}
                  className="cursor-pointer outline-none"
                  onClick={() => {
                    setSelected(a.code);
                    zoomToNode(n);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(a.code);
                      zoomToNode(n);
                    }
                  }}
                  onMouseMove={(e) => {
                    const r = svgRef.current?.getBoundingClientRect();
                    if (r) setHover({ area: a, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width });
                  }}
                  onFocus={() => setHover(null)}
                >
                  <rect x={n.x0} y={n.y0} width={w} height={h} rx={4} fill={fill} stroke={isSel ? "var(--foreground)" : "var(--background)"} strokeWidth={isSel ? 3 / scale : 2 / scale} />
                  {showSub &&
                    (n.children ?? []).map((c) => {
                      const cn = c.data.node;
                      if (cn.kind !== "sub") return null;
                      const cw = c.x1 - c.x0;
                      const ch = c.y1 - c.y0;
                      const fs = 13 / scale;
                      return (
                        <g key={c.data.name}>
                          <rect x={c.x0} y={c.y0} width={cw} height={ch} fill="none" stroke={ink === "paper" ? "var(--background)" : "var(--foreground)"} strokeOpacity={0.35} strokeWidth={1 / scale} />
                          {cw > fs * 4 && ch > fs * 1.6 && (
                            <text x={c.x0 + 4 / scale} y={c.y0 + fs * 1.2} fontSize={fs} className={ink === "paper" ? "fill-background" : "fill-foreground"} style={{ fontFamily: "var(--font-mono)" }}>
                              {truncate(`${cn.code} ${cn.label}`, Math.floor((cw - 8 / scale) / (fs * 0.6)))}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  {w > 44 && h > 26 && (
                    <text x={n.x0 + 7} y={n.y0 + 7 + fontSize} fontSize={fontSize} fontWeight={600} className={ink === "paper" ? "fill-background" : "fill-foreground"} style={{ fontFamily: "var(--font-mono)" }}>
                      {truncate(a.label, maxChars)}
                    </text>
                  )}
                  {w > 60 && h > 26 + fontSize * 1.6 && (
                    <text x={n.x0 + 7} y={n.y0 + 7 + fontSize * 2.4} fontSize={fontSize * 0.85} className={ink === "paper" ? "fill-background" : "fill-foreground"} style={{ fontFamily: "var(--font-mono)" }}>
                      {fmt(a.declarations)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        {hover && (
          <div
            className="pointer-events-none absolute z-20 max-w-xs rounded-md border border-border bg-popover p-3 text-sm text-foreground shadow-md"
            style={{ left: Math.min(hover.x + 14, hover.w - 260), top: hover.y + 14 }}
            role="status"
          >
            <p className="font-medium">{hover.area.code} · {hover.area.label}</p>
            <p>{fmt(hover.area.declarations)} declarations in {fmt(hover.area.modules)} files</p>
            <p>
              Famous theorems formalized: {hover.area.famous_total > 0 ? `${hover.area.famous_mathlib} of ${hover.area.famous_total} (${pct(coverage(hover.area) ?? 0)})` : "none in the list"}
            </p>
            <p>Open conjectures stated in Lean: {fmt(hover.area.conjectures_open)}</p>
          </div>
        )}
      </div>

      <div className="mt-3 hidden flex-wrap items-center justify-between gap-3 sm:flex">
        <div className="flex items-center gap-2">
          <span className="eyebrow text-muted-foreground">{metric === "coverage" ? "0% formalized" : "Fewest"}</span>
          <div className="flex overflow-hidden rounded-sm border border-border">
            {RAMP[mode].map((c) => <span key={c} className="h-4 w-6" style={{ background: c }} />)}
          </div>
          <span className="eyebrow text-muted-foreground">{metric === "coverage" ? "100%" : "Most"}</span>
          <span className="ml-3 inline-block h-4 w-6 rounded-sm border border-border" style={{ background: RAMP.neutral[mode] }} />
          <span className="eyebrow text-muted-foreground">{metric === "coverage" ? "No famous theorems listed" : "None"}</span>
        </div>
        {selectedArea ? (
          <p className="text-base text-foreground">
            <span className="font-medium">{selectedArea.code} · {selectedArea.label}</span>{" "}
            <Link href={areaHref(selectedArea.code)} className="text-accent-ink underline underline-offset-4 hover:text-foreground">Open this area</Link>
            {" · "}
            <button type="button" onClick={reset} className="text-accent-ink underline underline-offset-4 hover:text-foreground">Reset</button>
          </p>
        ) : (
          <p className="eyebrow text-muted-foreground">Click an area to zoom in · scroll or pinch to zoom · drag to pan</p>
        )}
      </div>
    </div>
  );
}
