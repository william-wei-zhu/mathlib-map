"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import "d3-transition";
import { Minus, Plus, Scan } from "lucide-react";
import { areaHref, coverage, fmt, pct, shortName, type AreaSummary, type MapIndex } from "@/lib/map-data";
import { RAMP, fillFor, rampStep, textOn } from "@/lib/ramp";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

const W = 1200;
const H = 760;
const R_MIN = 20;
const R_SPAN = 80;

type Metric = "coverage" | "conjectures";
type Placed = { area: AreaSummary; x: number; y: number; r: number };

function metricValue(a: AreaSummary, metric: Metric, maxConj: number): number | null {
  if (metric === "coverage") return coverage(a);
  return maxConj > 0 ? Math.sqrt(a.conjectures_open / maxConj) : null;
}

function truncate(label: string, maxChars: number): string {
  return label.length <= maxChars ? label : label.slice(0, Math.max(1, maxChars - 1)) + "…";
}

/** Organic, deterministic region outline: a wobbled circle rendered as a closed quadratic path. */
function blobPath(cx: number, cy: number, r: number, seed: number): string {
  const pts = 11;
  const out: [number, number][] = [];
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2;
    const w = 1 + 0.1 * Math.sin(a * 3 + seed) + 0.06 * Math.cos(a * 2 + seed * 1.7);
    out.push([cx + Math.cos(a) * r * w, cy + Math.sin(a) * r * w]);
  }
  let d = `M ${out[0][0].toFixed(1)} ${out[0][1].toFixed(1)} `;
  for (let i = 0; i < pts; i++) {
    const p0 = out[i];
    const p1 = out[(i + 1) % pts];
    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2;
    d += `Q ${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)} `;
  }
  return d + "Z";
}

/** Fallback layout when the embedding did not place areas: a size-ordered grid inside the viewBox. */
function gridLayout(areas: AreaSummary[], maxDecl: number): Placed[] {
  const sorted = [...areas].sort((a, b) => b.declarations - a.declarations);
  const cols = Math.ceil(Math.sqrt(sorted.length));
  const cw = (W - 2 * 70) / cols;
  const ch = (H - 2 * 70) / Math.ceil(sorted.length / cols);
  return sorted.map((area, i) => ({
    area,
    x: 70 + (i % cols) * cw + cw / 2,
    y: 70 + Math.floor(i / cols) * ch + ch / 2,
    r: Math.sqrt(area.declarations / maxDecl) * R_SPAN + R_MIN,
  }));
}

export function AtlasCanvas({ index }: { index: MapIndex }) {
  const { resolvedTheme } = useTheme();
  const mode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";
  const [metric, setMetric] = useState<Metric>("coverage");
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<{ area: AreaSummary; x: number; y: number } | null>(null);
  const [scale, setScale] = useState(1);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const areas = useMemo(() => index.areas.filter((a) => a.declarations > 0), [index]);
  const maxConj = useMemo(() => Math.max(0, ...areas.map((a) => a.conjectures_open)), [areas]);
  const maxDecl = useMemo(() => Math.max(1, ...areas.map((a) => a.declarations)), [areas]);

  const placed = useMemo<Placed[]>(() => {
    const withPos = areas.filter((a) => a.pos);
    if (withPos.length < 3) return gridLayout(areas, maxDecl);
    // Largest first so big regions paint under smaller neighbours and their labels win.
    return withPos
      .slice()
      .sort((a, b) => b.declarations - a.declarations)
      .map((area) => ({
        area,
        x: area.pos![0],
        y: area.pos![1],
        r: Math.sqrt(area.declarations / maxDecl) * R_SPAN + R_MIN,
      }));
  }, [areas, maxDecl]);

  useEffect(() => {
    const svgEl = svgRef.current;
    const gEl = gRef.current;
    if (!svgEl || !gEl) return;
    const g = select(gEl);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [W, H]])
      // Let the page keep its scroll: zoom by drag, pinch, and the buttons, never the wheel.
      .filter((ev) => ev.type !== "wheel" && !ev.button)
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

  const zoomTo = (p: Placed) => {
    const svgEl = svgRef.current;
    const z = zoomRef.current;
    if (!svgEl || !z) return;
    const k = Math.min(6, (Math.min(W, H) * 0.42) / p.r);
    const tx = W / 2 - k * p.x;
    const ty = H / 2 - k * p.y;
    select(svgEl).transition().duration(500).call(z.transform, zoomIdentity.translate(tx, ty).scale(k));
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
  const chip = (active: boolean) =>
    cn("eyebrow inline-flex h-9 items-center rounded-full border px-3.5 transition-colors", active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:border-foreground");
  const round = "inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:border-foreground";

  return (
    <div className="relative h-full w-full overflow-hidden bg-card">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        role="img"
        aria-label="Map of mathematics areas, placed so areas that share theorems sit near each other"
        onMouseLeave={() => setHover(null)}
      >
        <g ref={gRef}>
          {placed.map((p, i) => {
            const a = p.area;
            const step = rampStep(metricValue(a, metric, maxConj));
            const fill = fillFor(step, mode);
            const ink = textOn(step, mode);
            const inkVar = ink === "paper" ? "fill-background" : "fill-foreground";
            const inkStroke = ink === "paper" ? "var(--background)" : "var(--foreground)";
            const isSel = selected === a.code;
            const dim = selected !== null && !isSel;
            const nameSize = Math.max(13, p.r * 0.2);
            const seed = i * 1.3 + 0.4;
            const subs = isSel ? a.subareas.filter((s) => s.declarations > 0).slice(0, 6) : [];
            return (
              <g
                key={a.code}
                role="button"
                tabIndex={0}
                aria-label={`${a.code} ${a.label}: ${fmt(a.declarations)} declarations`}
                className="cursor-pointer outline-none"
                style={{ opacity: dim ? 0.25 : 1, transition: "opacity .3s" }}
                onClick={() => { setSelected(a.code); zoomTo(p); track("map_area_zoomed", { area: a.code }); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(a.code); zoomTo(p); }
                }}
                onMouseMove={(e) => {
                  const r = svgRef.current?.getBoundingClientRect();
                  if (r) setHover({ area: a, x: e.clientX - r.left, y: e.clientY - r.top });
                }}
                onFocus={() => setHover(null)}
              >
                <path d={blobPath(p.x, p.y, p.r + 8, seed)} className="fill-none" stroke="var(--border)" strokeWidth={1 / scale} opacity={0.4} />
                <path d={blobPath(p.x, p.y, p.r + 4, seed)} className="fill-none" stroke="var(--border)" strokeWidth={1 / scale} opacity={0.55} />
                <path
                  d={blobPath(p.x, p.y, p.r, seed)}
                  fill={fill}
                  stroke={isSel ? "var(--foreground)" : "var(--background)"}
                  strokeWidth={(isSel ? 3 : 2) / scale}
                />
                <path d={blobPath(p.x, p.y, p.r * 0.58, seed + 0.5)} className="fill-none" stroke={inkStroke} strokeWidth={0.8 / scale} opacity={0.1} />

                {subs.map((s, si) => {
                  const ang = -1.15 + si * (2.3 / Math.max(1, subs.length - 1));
                  const rad = p.r + 12 / scale;
                  const sx = p.x + Math.cos(ang) * rad;
                  const sy = p.y + Math.sin(ang) * rad;
                  return (
                    <text key={s.code} x={sx} y={sy} textAnchor={Math.cos(ang) < 0 ? "end" : "start"} fontSize={9 / scale} fill="var(--muted-foreground)" style={{ fontFamily: "var(--font-mono)" }}>
                      {truncate(`${s.code} ${s.label}`, 24)}
                    </text>
                  );
                })}

                {p.r > 26 && (
                  <text x={p.x} y={p.y - 2} textAnchor="middle" fontWeight={600} fontSize={nameSize} className={inkVar} style={{ fontFamily: "var(--font-display)" }}>
                    {truncate(shortName(a), Math.floor((p.r * 2 - 8) / (nameSize * 0.5)))}
                  </text>
                )}
                {p.r > 38 && (
                  <text x={p.x} y={p.y + nameSize} textAnchor="middle" fontSize={nameSize * 0.6} className={inkVar} style={{ fontFamily: "var(--font-mono)", opacity: 0.85 }}>
                    {fmt(a.declarations)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* color-by controls */}
      <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-2">
        <span className="eyebrow rounded-full bg-card/80 px-2 py-1 text-muted-foreground backdrop-blur">Color by</span>
        <div className="pointer-events-auto flex gap-2">
          <button type="button" className={chip(metric === "coverage")} onClick={() => { setMetric("coverage"); track("map_color_changed", { metric: "coverage" }); }}>Famous theorems formalized</button>
          <button type="button" className={chip(metric === "conjectures")} onClick={() => { setMetric("conjectures"); track("map_color_changed", { metric: "conjectures" }); }}>Open conjectures stated</button>
        </div>
      </div>

      {/* zoom controls */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-2">
        <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoom in" title="Zoom in" className={round}><Plus className="h-5 w-5" /></button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out" title="Zoom out" className={round}><Minus className="h-5 w-5" /></button>
        <button type="button" onClick={reset} aria-label="Reset view" title="Reset view" className={round}><Scan className="h-4 w-4" /></button>
      </div>

      {/* legend */}
      <div className="absolute bottom-5 left-4 max-w-[280px] rounded-xl border border-border bg-card/95 p-3 shadow-sm backdrop-blur">
        <span className="eyebrow text-muted-foreground">{metric === "coverage" ? "Famous theorems formalized" : "Open conjectures stated"}</span>
        <div className="mt-2 flex items-center gap-2">
          <span className="eyebrow text-muted-foreground">{metric === "coverage" ? "0%" : "few"}</span>
          <div className="flex overflow-hidden rounded-sm border border-border">
            {RAMP[mode].map((c) => <span key={c} className="h-3 w-5" style={{ background: c }} />)}
          </div>
          <span className="eyebrow text-muted-foreground">{metric === "coverage" ? "100%" : "many"}</span>
        </div>
        <p className="mt-2 text-xs leading-snug text-muted-foreground">Regions sized by declarations; areas that share theorems sit near each other. Drag to pan, click a region to zoom.</p>
      </div>

      {/* selected-area banner */}
      {selectedArea && (
        <div className="absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card px-4 py-2 text-sm shadow-sm">
          <span className="font-medium">{selectedArea.code} · {shortName(selectedArea)}</span>
          <Link href={areaHref(selectedArea.code)} className="text-accent-ink underline underline-offset-4 hover:text-foreground">Open area</Link>
          <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground">Reset</button>
        </div>
      )}

      {hover && !selectedArea && (
        <div
          className="pointer-events-none absolute z-20 max-w-xs rounded-md border border-border bg-popover p-3 text-sm text-foreground shadow-md"
          style={{ left: Math.min(hover.x + 14, W - 40), top: hover.y + 14 }}
          role="status"
        >
          <p className="font-medium">{hover.area.code} · {hover.area.label}</p>
          <p>{fmt(hover.area.declarations)} declarations in {fmt(hover.area.modules)} files</p>
          <p>Famous theorems: {hover.area.famous_total > 0 ? `${hover.area.famous_mathlib} of ${hover.area.famous_total} (${pct(coverage(hover.area) ?? 0)})` : "none listed"}</p>
        </div>
      )}
    </div>
  );
}
