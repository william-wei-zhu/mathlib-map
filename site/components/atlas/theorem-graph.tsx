"use client";

import { useRef } from "react";
import type { Neighbor } from "@/lib/atlas-data";

export type GraphNode = {
  name: string;
  kind: string;
  uses: Neighbor[];
  usedBy: Neighbor[];
};

const VW = 1000;
const VH = 680;

function isDef(kind: string): boolean {
  return kind === "definition" || kind === "inductive" || kind === "opaque";
}

/**
 * Focus+context view of one declaration's dependency neighbourhood, drawn over the (faint) map.
 * The centre is the current declaration; what it cites sits below, what cites it sits above.
 * Dashed edges are statement dependencies, solid edges are proof citations. Click any neighbour to
 * re-centre on it (the working mode of the theorem layer).
 */
export function TheoremGraph({
  node,
  onPick,
  onDismiss,
  containerClassName = "inset-0",
}: {
  node: GraphNode | null;
  onPick: (name: string) => void;
  /** Leave the graph and step up one level (to the declaration's area). */
  onDismiss?: () => void;
  /** Positions the overlay over the *visible* map area (outside the panel) so the graph is not
   *  half-hidden. Defaults to full-bleed. */
  containerClassName?: string;
}) {
  const wheelAcc = useRef(0);
  // Scroll / pinch out to leave the graph (the map behind it is covered by this overlay, so its own
  // zoom-out-to-exit cannot fire; we handle the gesture here). A decisive downward scroll dismisses.
  const onWheel = (e: React.WheelEvent) => {
    if (!onDismiss) return;
    if (e.deltaY > 0) {
      wheelAcc.current += e.deltaY;
      if (wheelAcc.current > 90) { wheelAcc.current = 0; onDismiss(); }
    } else {
      wheelAcc.current = 0;
    }
  };
  if (!node) return null;
  const cx = VW / 2;
  const cy = VH / 2;
  const uses = (node.uses ?? []).slice(0, 6);
  const usedBy = (node.usedBy ?? []).slice(0, 5);

  const place = (list: Neighbor[], y: number) => {
    const n = Math.max(1, list.length);
    const spread = Math.min(180, (VW - 160) / n);
    const start = cx - ((n - 1) / 2) * spread;
    return list.map((d, i) => ({ d, x: start + i * spread, y }));
  };
  const up = place(usedBy, cy - 210).map((o, i) => ({ ...o, i, up: true }));
  const down = place(uses, cy + 210).map((o, i) => ({ ...o, i, up: false }));
  const short = (s: string) => s.split(".").pop() ?? s; // last dotted segment, never truncated

  const edge = (x: number, y: number, via: string, key: string) => (
    <path
      key={key}
      d={`M ${cx} ${cy} C ${cx} ${(cy + y) / 2} ${x} ${(cy + y) / 2} ${x} ${y}`}
      fill="none"
      stroke="var(--accent-ink)"
      strokeWidth={1.6}
      opacity={0.55}
      strokeDasharray={via === "proof" ? undefined : "6 5"}
    />
  );

  const nameW = Math.min(VW - 60, Math.max(180, node.name.length * 12.5 + 44));

  return (
    <div className={`pointer-events-none absolute z-10 ${containerClassName}`}>
      <div className="absolute inset-0 bg-background/55 backdrop-blur-[1px]" />
      <svg
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-auto relative h-full w-full cursor-zoom-out"
        onWheel={onWheel}
        onClick={(e) => { if (e.target === e.currentTarget && onDismiss) onDismiss(); }}
      >
        {onDismiss && (
          <text x={cx} y={24} textAnchor="middle" fontSize={15} letterSpacing="0.5" fill="var(--muted-foreground)" opacity={0.85} style={{ fontFamily: "var(--font-mono)" }}>
            scroll out or click away to leave
          </text>
        )}
        <text x={cx} y={cy - 288} textAnchor="middle" fontSize={17} letterSpacing="1.5" fill="var(--muted-foreground)" style={{ fontFamily: "var(--font-mono)" }}>
          {usedBy.length > 0 ? "CITED BY" : "CITED BY NOTHING YET"}
        </text>
        <text x={cx} y={cy + 322} textAnchor="middle" fontSize={17} letterSpacing="1.5" fill="var(--muted-foreground)" style={{ fontFamily: "var(--font-mono)" }}>
          {uses.length > 0 ? "CITES" : "RESTS ON AXIOMS"}
        </text>

        {up.map(({ d, x, y }) => edge(x, y, d.via, "eu" + d.name))}
        {down.map(({ d, x, y }) => edge(x, y, d.via, "ed" + d.name))}

        {[...up, ...down].map(({ d, x, y, i, up: isUp }) => {
          const r = 10 + Math.sqrt(d.citedBy) / 14;
          // Full names are shown untruncated, so the label sits on the outer side of the node and
          // every other one is pushed further out, so neighbours never collide horizontally.
          const stagger = (i % 2) * 26;
          const labelY = isUp ? y - r - 12 - stagger : y + r + 26 + stagger;
          const countY = isUp ? y + r + 24 : y - r - 12;
          return (
            <g
              key={d.name}
              className="cursor-pointer outline-none"
              role="button"
              tabIndex={0}
              aria-label={`${short(d.name)}: cited by ${d.citedBy}`}
              onClick={() => onPick(d.name)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onPick(d.name); } }}
            >
              <circle cx={x} cy={y} r={r} fill={isDef(d.kind) ? "var(--card)" : "var(--accent-ink)"} stroke="var(--accent-ink)" strokeWidth={1.8} />
              <text x={x} y={labelY} textAnchor="middle" fontSize={18} fill="var(--foreground)" style={{ fontFamily: "var(--font-mono)" }}>
                {short(d.name)}
              </text>
              <text x={x} y={countY} textAnchor="middle" fontSize={13} fill="var(--muted-foreground)" style={{ fontFamily: "var(--font-mono)" }}>
                {d.citedBy.toLocaleString()}
              </text>
            </g>
          );
        })}

        <rect x={cx - nameW / 2} y={cy - 27} width={nameW} height={54} rx={27} fill="var(--foreground)" />
        <text x={cx} y={cy + 7} textAnchor="middle" fontSize={21} fill="var(--background)" style={{ fontFamily: "var(--font-mono)" }}>
          {node.name}
        </text>
      </svg>
    </div>
  );
}
