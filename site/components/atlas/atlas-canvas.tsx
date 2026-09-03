"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useThemeMode } from "@/lib/use-theme-mode";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import "d3-transition";
import { Minus, Plus, Scan } from "lucide-react";
import { coverage, fmt, pct, shortName, type AreaSummary, type MapIndex } from "@/lib/map-data";
import { fillFor, rampStep, textOn } from "@/lib/ramp";

const W = 1200;
const H = 760;
const R_MIN = 20;
const R_SPAN = 80;

export type Metric = "coverage" | "conjectures";
export type Landmark = { name: string; citedBy: number };
type Placed = { area: AreaSummary; x: number; y: number; r: number };

function metricValue(a: AreaSummary, metric: Metric, maxConj: number): number | null {
  if (metric === "coverage") return coverage(a);
  return maxConj > 0 ? Math.sqrt(a.conjectures_open / maxConj) : null;
}

/** Word-wrap a label into lines of at most maxChars, never truncating (a long word overflows). */
function wrapLabel(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + " " + w).length <= maxChars) cur = cur + " " + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}

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

/**
 * The World map. Controlled by the shell: `metric` shades it, `focusCode` (from the route) zooms
 * to and highlights an area, and `onPick` fires when a region is clicked so the shell can route to
 * that area. Wheel-zoom is disabled so the surrounding page can scroll; drag and buttons pan/zoom.
 */
export function AtlasCanvas({
  index,
  metric,
  focusCode,
  landmarks = [],
  activeNode,
  onPick,
  onNode,
  onExitFocus,
}: {
  index: MapIndex;
  metric: Metric;
  focusCode?: string | null;
  landmarks?: Landmark[];
  activeNode?: string | null;
  onPick?: (code: string) => void;
  onNode?: (name: string) => void;
  /** Return to the world view (up one altitude) when the user zooms out of a focused region. */
  onExitFocus?: () => void;
}) {
  const mode = useThemeMode();
  const [hover, setHover] = useState<{ area: AreaSummary; x: number; y: number; w: number; h: number } | null>(null);
  const [scale, setScale] = useState(1);
  // Screen pixels per viewBox unit (from the rendered SVG). Lets landmark nodes/labels be sized in
  // real screen pixels instead of viewBox units, which otherwise render tiny on a narrow phone where
  // the 1200-wide viewBox is squeezed into ~390px.
  const [pxPerUnit, setPxPerUnit] = useState(0.8);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  // Latest focus/exit for the zoom handler, which is installed once. `exiting` debounces the
  // exit so a continuous wheel-out fires the route change only once.
  const focusRef = useRef<string | null | undefined>(focusCode);
  const exitRef = useRef<(() => void) | undefined>(onExitFocus);
  const exitingRef = useRef(false);
  const flownRef = useRef<string | null>(null); // the area we last flew to (guards against re-fly loops)
  const prevKRef = useRef(1); // last zoom scale, to tell a zoom-out gesture from a zoom-in
  useEffect(() => { focusRef.current = focusCode; exitRef.current = onExitFocus; });
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (box?.width && box?.height) setPxPerUnit(Math.min(box.width / W, box.height / H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const areas = useMemo(() => index.areas.filter((a) => a.declarations > 0), [index]);
  const maxConj = useMemo(() => Math.max(0, ...areas.map((a) => a.conjectures_open)), [areas]);
  const maxDecl = useMemo(() => Math.max(1, ...areas.map((a) => a.declarations)), [areas]);

  // Load-bearing memo: recomputed every render would re-place all regions on each zoom frame
  // (setScale fires per frame). React Compiler is not enabled, so this manual memo must stay.
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const placed = useMemo<Placed[]>(() => {
    const withPos = areas.filter((a) => a.pos);
    if (withPos.length < 3) return gridLayout(areas, maxDecl);
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
      // Wheel-zoom is enabled: the shell is overflow-hidden, so there is no page scroll to protect,
      // and a Google-Maps-style map should zoom on the wheel. Only the right/middle mouse buttons
      // are excluded so panning stays on the primary button.
      .filter((ev) => !ev.button)
      .on("zoom", (ev) => {
        g.attr("transform", ev.transform.toString());
        setScale(ev.transform.k);
        // Zooming OUT of a focused region past ~the world scale returns to the world (higher level).
        // Guards: only a user gesture (sourceEvent) that is actually zooming out, so the programmatic
        // fly-in never triggers it and a zoom-in near the world scale does not eject the user.
        const k = ev.transform.k;
        const zoomingOut = k < prevKRef.current - 1e-4;
        prevKRef.current = k;
        if (ev.sourceEvent && zoomingOut && focusRef.current && !exitingRef.current && k < 1.25) {
          exitingRef.current = true;
          exitRef.current?.();
        }
      });
    const sel = select(svgEl);
    sel.call(z);
    zoomRef.current = z;
    return () => {
      sel.on(".zoom", null);
      zoomRef.current = null;
    };
  }, []);

  const flyTo = useCallback((p: Placed) => {
    const svgEl = svgRef.current;
    const z = zoomRef.current;
    if (!svgEl || !z) return;
    const k = Math.min(6, (Math.min(W, H) * 0.42) / p.r);
    const tx = W / 2 - k * p.x;
    const ty = H / 2 - k * p.y;
    // Apply the focus transform instantly. An animated transition launched around a route change
    // gets interrupted by the re-render churn before it can paint, leaving the map stuck at the
    // world scale, so we snap to the region instead of animating.
    select(svgEl).call(z.transform, zoomIdentity.translate(tx, ty).scale(k));
  }, []);
  const reset = useCallback(() => {
    const svgEl = svgRef.current;
    const z = zoomRef.current;
    if (!svgEl || !z) return;
    select(svgEl).call(z.transform, zoomIdentity);
  }, []);
  const zoomBy = (f: number) => {
    const svgEl = svgRef.current;
    const z = zoomRef.current;
    if (!svgEl || !z) return;
    // Zooming out (the minus button) at a focused region should step back up to the world once it
    // reaches world scale, the same as a wheel/pinch zoom-out. Without this the button just shrinks
    // the region and the user is stuck at the region level.
    if (f < 1 && focusCode && scale * f < 1.35) {
      onExitFocus?.();
      return;
    }
    select(svgEl).transition().duration(200).call(z.scaleBy, f);
  };

  // React to the route: fly to the focused area, or reset when there is none.
  useEffect(() => {
    exitingRef.current = false; // a new focus (or the world) re-arms the zoom-out-to-exit gesture
    if (!focusCode) {
      flownRef.current = null;
      reset();
      return;
    }
    // Fly to a focused area only once. The effect can re-run while focused (the shell updates
    // landmarks etc.); re-calling flyTo would start a fresh transition that interrupts the previous
    // one before it paints, so the map would never actually zoom in.
    if (flownRef.current === focusCode) return;
    const p = placed.find((x) => x.area.code === focusCode);
    if (p) {
      flownRef.current = focusCode;
      flyTo(p);
    }
  }, [focusCode, placed, flyTo, reset]);

  // Viewbox units that render to `px` on-screen pixels (compensating for both the map zoom and the
  // rendered SVG scale), so landmark nodes and labels are a readable size on every device.
  const su = (px: number) => px / (scale * pxPerUnit);
  // Fewer landmarks on a small screen so the larger labels have room and do not overlap.
  const maxLandmarks = pxPerUnit < 0.5 ? 8 : 16;

  return (
    <div className="relative h-full w-full overflow-hidden bg-card">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full cursor-grab touch-none active:cursor-grabbing"
        role="group"
        aria-label="Map of mathematics areas: horizontal position groups areas that share theorems, height rises with distance from the axioms, size grows with declaration count."
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
            const isSel = focusCode === a.code;
            const dim = !!focusCode && !isSel;
            const nameSize = Math.max(11, Math.min(p.r * 0.24, 21));
            const maxChars = Math.max(6, Math.floor((p.r * 1.75) / (nameSize * 0.5)));
            const lines = wrapLabel(shortName(a), maxChars);
            const lineH = nameSize * 1.02;
            const showCount = p.r > 34;
            const blockH = lines.length * lineH + (showCount ? nameSize * 0.9 : 0);
            const startY = p.y - blockH / 2 + nameSize * 0.82;
            const seed = i * 1.3 + 0.4;
            return (
              <g
                key={a.code}
                role="button"
                tabIndex={0}
                aria-label={`${a.code} ${a.label}: ${fmt(a.declarations)} declarations`}
                className="cursor-pointer outline-none"
                style={{ opacity: dim ? 0.28 : 1, transition: "opacity .3s" }}
                onClick={() => onPick?.(a.code)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick?.(a.code); }
                }}
                onMouseMove={(e) => {
                  const r = svgRef.current?.getBoundingClientRect();
                  if (r) setHover({ area: a, x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height });
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

                {isSel ? (
                  <>
                    {!activeNode && (
                      <text x={p.x} y={p.y - p.r + su(26)} textAnchor="middle" fontWeight={600} fontSize={su(22)} className={inkVar} style={{ fontFamily: "var(--font-display)" }}>
                        {shortName(a)}
                      </text>
                    )}
                    {landmarks.slice(0, maxLandmarks).map((lm, li, arr) => {
                      const ang = li * 2.399963;
                      const rad = p.r * 0.72 * Math.sqrt((li + 0.7) / arr.length);
                      const nx = p.x + Math.cos(ang) * rad;
                      const ny = p.y + Math.sin(ang) * rad + p.r * 0.14;
                      const active = activeNode === lm.name;
                      const rr = su(active ? 12 : 8.5) + su(Math.sqrt(lm.citedBy) / 7);
                      const label = lm.name.split(".").pop() ?? lm.name;
                      return (
                        <g
                          key={lm.name}
                          className="cursor-pointer outline-none"
                          role="button"
                          tabIndex={0}
                          aria-label={`${label}: cited by ${lm.citedBy}`}
                          onClick={(e) => { e.stopPropagation(); onNode?.(lm.name); }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onNode?.(lm.name); }
                          }}
                        >
                          {active && <circle cx={nx} cy={ny} r={rr + su(5)} fill="none" stroke={inkStroke} strokeWidth={su(1.8)} />}
                          <circle cx={nx} cy={ny} r={rr} fill={active ? "var(--accent-ink)" : "var(--background)"} stroke="var(--accent-ink)" strokeWidth={su(1.6)} />
                          <text x={nx} y={ny - rr - su(6)} textAnchor="middle" fontSize={su(15)} fontWeight={active ? 600 : 400} fill={inkStroke} style={{ fontFamily: "var(--font-mono)" }}>
                            {label}
                          </text>
                        </g>
                      );
                    })}
                  </>
                ) : (
                  !focusCode && (
                    <>
                      {lines.map((ln, li) => (
                        <text key={li} x={p.x} y={startY + li * lineH} textAnchor="middle" fontWeight={600} fontSize={nameSize} className={inkVar} style={{ fontFamily: "var(--font-display)" }}>
                          {ln}
                        </text>
                      ))}
                      {showCount && (
                        <text x={p.x} y={startY + lines.length * lineH + nameSize * 0.1} textAnchor="middle" fontSize={nameSize * 0.6} className={inkVar} style={{ fontFamily: "var(--font-mono)", opacity: 0.85 }}>
                          {fmt(a.declarations)}
                        </text>
                      )}
                    </>
                  )
                )}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="absolute right-3 top-[4.5rem] z-30 flex flex-col gap-2 sm:right-5 sm:top-auto sm:bottom-5">
        <button type="button" onClick={() => zoomBy(1.6)} aria-label="Zoom in" title="Zoom in" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:border-foreground"><Plus className="h-5 w-5" /></button>
        <button type="button" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out" title="Zoom out" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:border-foreground"><Minus className="h-5 w-5" /></button>
        <button
          type="button"
          onClick={() => (focusCode ? onExitFocus?.() : reset())}
          aria-label={focusCode ? "Back to the world map" : "Reset view"}
          title={focusCode ? "Back to the world map" : "Reset view"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm transition-colors hover:border-foreground"
        >
          <Scan className="h-4 w-4" />
        </button>
      </div>

      {hover && !focusCode && (
        <div
          className="pointer-events-none absolute z-20 w-64 max-w-[calc(100vw-1.5rem)] rounded-md border border-border bg-popover p-3 text-sm text-foreground shadow-md"
          style={{
            left: Math.max(8, Math.min(hover.x + 14, hover.w - 264)),
            top: Math.max(8, Math.min(hover.y + 14, hover.h - 96)),
          }}
          aria-hidden="true"
        >
          <p className="font-medium">{hover.area.code} · {hover.area.label}</p>
          <p>{fmt(hover.area.declarations)} declarations in {fmt(hover.area.modules)} files</p>
          <p>Famous theorems: {hover.area.famous_total > 0 ? `${hover.area.famous_mathlib} of ${hover.area.famous_total} (${pct(coverage(hover.area) ?? 0)})` : "none listed"}</p>
        </div>
      )}
    </div>
  );
}
