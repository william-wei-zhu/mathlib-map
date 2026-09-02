"use client";

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
  containerClassName = "inset-0",
}: {
  node: GraphNode | null;
  onPick: (name: string) => void;
  /** Positions the overlay over the *visible* map area (outside the panel) so the graph is not
   *  half-hidden. Defaults to full-bleed. */
  containerClassName?: string;
}) {
  if (!node) return null;
  const cx = VW / 2;
  const cy = VH / 2;
  const uses = (node.uses ?? []).slice(0, 8);
  const usedBy = (node.usedBy ?? []).slice(0, 6);

  const place = (list: Neighbor[], y: number) => {
    const n = Math.max(1, list.length);
    const spread = Math.min(150, (VW - 200) / n);
    const start = cx - ((n - 1) / 2) * spread;
    return list.map((d, i) => ({ d, x: start + i * spread, y }));
  };
  const up = place(usedBy, cy - 210);
  const down = place(uses, cy + 210);
  const short = (s: string) => s.split(".").pop() ?? s;

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

  const nameW = Math.min(VW - 80, Math.max(150, node.name.length * 9.5 + 34));

  return (
    <div className={`pointer-events-none absolute z-10 ${containerClassName}`}>
      <div className="absolute inset-0 bg-background/55 backdrop-blur-[1px]" />
      <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" className="pointer-events-auto relative h-full w-full">
        <text x={cx} y={cy - 250} textAnchor="middle" fontSize={12} letterSpacing="1.5" fill="var(--muted-foreground)" style={{ fontFamily: "var(--font-mono)" }}>
          {usedBy.length > 0 ? "CITED BY" : "CITED BY NOTHING YET"}
        </text>
        <text x={cx} y={cy + 268} textAnchor="middle" fontSize={12} letterSpacing="1.5" fill="var(--muted-foreground)" style={{ fontFamily: "var(--font-mono)" }}>
          {uses.length > 0 ? "CITES" : "RESTS ON AXIOMS"}
        </text>

        {up.map(({ d, x, y }) => edge(x, y, d.via, "eu" + d.name))}
        {down.map(({ d, x, y }) => edge(x, y, d.via, "ed" + d.name))}

        {[...up, ...down].map(({ d, x, y }) => {
          const r = 7 + Math.sqrt(d.citedBy) / 16;
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
              <circle cx={x} cy={y} r={r} fill={isDef(d.kind) ? "var(--card)" : "var(--accent-ink)"} stroke="var(--accent-ink)" strokeWidth={1.5} />
              <text x={x} y={y - r - 6} textAnchor="middle" fontSize={12.5} fill="var(--foreground)" style={{ fontFamily: "var(--font-mono)" }}>
                {short(d.name)}
              </text>
              <text x={x} y={y + r + 15} textAnchor="middle" fontSize={10} fill="var(--muted-foreground)" style={{ fontFamily: "var(--font-mono)" }}>
                {d.citedBy.toLocaleString()}
              </text>
            </g>
          );
        })}

        <rect x={cx - nameW / 2} y={cy - 22} width={nameW} height={44} rx={22} fill="var(--foreground)" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={15} fill="var(--background)" style={{ fontFamily: "var(--font-mono)" }}>
          {node.name}
        </text>
      </svg>
    </div>
  );
}
