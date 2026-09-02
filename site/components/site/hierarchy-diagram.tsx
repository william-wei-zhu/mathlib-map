"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ELK, { type ElkNode, type ElkExtendedEdge } from "elkjs/lib/elk.bundled.js";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import "d3-transition";
import { Minus, Plus, Scan } from "lucide-react";
import { classHref } from "@/lib/data";
import type { Graph } from "@/lib/hierarchy-client";

type Laid = {
  width: number;
  height: number;
  nodes: { id: string; x: number; y: number; w: number; h: number }[];
  edges: { id: string; kind: string; points: { x: number; y: number }[] }[];
};

const NODE_H = 38;
const CHAR_W = 9.4;

function nodeWidth(id: string) {
  return Math.max(64, Math.round(id.length * CHAR_W + 28));
}

/**
 * Layered diagram of a set of classes. More general classes sit above more specific ones.
 * Solid edges are `extends`; dashed edges are forgetful instances.
 */
export function HierarchyDiagram({
  graph,
  ids,
  focus,
  highlight,
}: {
  graph: Graph;
  ids: string[];
  focus: string | null;
  highlight: Set<string> | null;
}) {
  // The result is keyed by the id list, so a stale layout is simply ignored on the next
  // render instead of being reset inside the effect.
  const [result, setResult] = useState<{ key: string; laid: Laid | null; failed: boolean } | null>(null);
  const idSet = useMemo(() => new Set(ids), [ids]);
  const key = ids.join("|");
  const current = result && result.key === key ? result : null;
  const laid = current?.laid ?? null;
  const failed = current?.failed ?? false;

  useEffect(() => {
    let alive = true;
    const elk = new ELK();
    const edges = graph.index.edges.filter((e) => idSet.has(e.from) && idSet.has(e.to));
    const elkGraph: ElkNode = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.edgeRouting": "POLYLINE",
        "elk.layered.spacing.nodeNodeBetweenLayers": "56",
        "elk.spacing.nodeNode": "22",
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
        "elk.layered.crossingMinimization.thoroughness": "20",
      },
      children: ids.map((id) => ({ id, width: nodeWidth(id), height: NODE_H })),
      // Parent above child: the edge runs from the more general class down to the more specific one.
      edges: edges.map<ElkExtendedEdge>((e) => ({ id: e.via, sources: [e.to], targets: [e.from] })),
    };
    elk
      .layout(elkGraph)
      .then((res) => {
        if (!alive) return;
        const kinds = new Map(edges.map((e) => [e.via, e.kind]));
        setResult({ key, failed: false, laid: {
          width: Math.ceil(res.width ?? 0) + 2,
          height: Math.ceil(res.height ?? 0) + 2,
          nodes: (res.children ?? []).map((n) => ({ id: n.id, x: n.x ?? 0, y: n.y ?? 0, w: n.width ?? 0, h: n.height ?? 0 })),
          edges: (res.edges ?? []).map((e) => {
            const s = e.sections?.[0];
            const points = s ? [s.startPoint, ...(s.bendPoints ?? []), s.endPoint] : [];
            return { id: e.id, kind: kinds.get(e.id) ?? "extends", points };
          }),
        } });
      })
      .catch(() => alive && setResult({ key, failed: true, laid: null }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, graph]);

  // Google-Maps-style pan and zoom: wheel or pinch to zoom, drag to pan, buttons for the rest.
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const fit = useCallback(
    (animate = true) => {
      const svgEl = svgRef.current;
      const z = zoomRef.current;
      if (!svgEl || !z || !laid) return;
      const { width: cw, height: ch } = svgEl.getBoundingClientRect();
      const k = Math.min(cw / laid.width, ch / laid.height, 1.2) * 0.94;
      const tx = (cw - laid.width * k) / 2;
      const ty = Math.max(12, (ch - laid.height * k) / 2);
      const sel = select(svgEl);
      const target = zoomIdentity.translate(tx, ty).scale(k);
      if (animate) sel.transition().duration(350).call(z.transform, target);
      else sel.call(z.transform, target);
    },
    [laid],
  );

  useEffect(() => {
    const svgEl = svgRef.current;
    const gEl = gRef.current;
    if (!svgEl || !gEl || !laid) return;
    const g = select(gEl);
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (ev) => g.attr("transform", ev.transform.toString()));
    const sel = select(svgEl);
    sel.call(z);
    zoomRef.current = z;
    fit(false);
    return () => {
      sel.on(".zoom", null);
      zoomRef.current = null;
    };
  }, [laid, fit]);

  const zoomBy = (factor: number) => {
    const svgEl = svgRef.current;
    const z = zoomRef.current;
    if (!svgEl || !z) return;
    select(svgEl).transition().duration(200).call(z.scaleBy, factor);
  };

  if (ids.length === 0) {
    return <p className="text-base text-muted-foreground">Nothing to draw for this selection.</p>;
  }
  if (failed) {
    return <p className="text-base text-foreground">The layout engine failed on this selection. Try a smaller set.</p>;
  }
  if (!laid) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card">
        <p className="eyebrow text-muted-foreground">Laying out {ids.length} classes…</p>
      </div>
    );
  }

  const btn =
    "inline-flex h-11 w-11 items-center justify-center rounded-full border border-foreground/50 bg-background text-foreground transition-colors hover:border-foreground";

  return (
    <div className="relative rounded-lg border border-border bg-card">
      <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
        <button type="button" onClick={() => zoomBy(1.5)} aria-label="Zoom in" title="Zoom in" className={btn}>
          <Plus className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 1.5)} aria-label="Zoom out" title="Zoom out" className={btn}>
          <Minus className="h-5 w-5" />
        </button>
        <button type="button" onClick={() => fit()} aria-label="Fit to view" title="Fit to view" className={btn}>
          <Scan className="h-5 w-5" />
        </button>
      </div>
      <svg
        ref={svgRef}
        role="img"
        aria-label={`Diagram of ${ids.length} classes. Drag to pan, scroll or pinch to zoom.`}
        className="block h-[70vh] w-full touch-none cursor-grab active:cursor-grabbing"
      >
        <g ref={gRef}>
        <g fill="none" strokeWidth={1.5} className="stroke-foreground/45">
          {laid.edges.map((e) => (
            <polyline
              key={e.id}
              points={e.points.map((p) => `${p.x},${p.y}`).join(" ")}
              strokeDasharray={e.kind === "forgetful" ? "5 4" : undefined}
            />
          ))}
        </g>
        {laid.nodes.map((n) => {
          const isFocus = n.id === focus;
          const lit = highlight?.has(n.id) ?? false;
          const doc = graph.byId.get(n.id)?.doc ?? undefined;
          return (
            <a key={n.id} href={classHref(n.id)} className="group">
              <title>{doc ? `${n.id}: ${doc}` : n.id}</title>
              <rect
                x={n.x}
                y={n.y}
                width={n.w}
                height={n.h}
                rx={n.h / 2}
                className={
                  isFocus
                    ? "fill-foreground stroke-foreground"
                    : lit
                      ? "fill-accent-tint stroke-accent-ink"
                      : "fill-background stroke-foreground/50 group-hover:stroke-foreground"
                }
                strokeWidth={isFocus || lit ? 2 : 1.25}
              />
              <text
                x={n.x + n.w / 2}
                y={n.y + n.h / 2 + 5}
                textAnchor="middle"
                className={isFocus ? "lean fill-background" : "lean fill-foreground"}
                style={{ fontSize: 15 }}
              >
                {n.id}
              </text>
            </a>
          );
        })}
        </g>
      </svg>
      <p className="eyebrow px-3 py-2 text-muted-foreground">Drag to pan · scroll or pinch to zoom · click a class to open it</p>
    </div>
  );
}
