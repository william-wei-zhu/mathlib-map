import Link from "next/link";
import { declHref, type Neighbor } from "@/lib/atlas-data";

const W = 760;
const H = 420;

function short(name: string, max = 26): string {
  const last = name.split(".").slice(-2).join(".");
  return last.length <= max ? last : last.slice(0, max - 1) + "…";
}

/**
 * A small star: what this declaration cites (below) and what cites it (above), most cited first.
 * Server-rendered SVG, no library. Every node links to its page.
 */
export function DependencyStar({ name, uses, usedBy }: { name: string; uses: Neighbor[]; usedBy: Neighbor[] }) {
  const below = uses.slice(0, 15);
  const above = usedBy.slice(0, 15);
  if (below.length + above.length === 0) return null;
  const cx = W / 2;
  const cy = H / 2;
  const place = (items: Neighbor[], y: number) =>
    items.map((n, i) => {
      const x = items.length === 1 ? cx : 60 + ((W - 120) * i) / (items.length - 1);
      return { n, x, y };
    });
  const up = place(above, 48);
  const down = place(below, H - 48);
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[560px]" role="img" aria-label={`${above.length} results cite ${name}; it cites ${below.length}.`}>
        <g className="stroke-foreground/35" strokeWidth={1.2} fill="none">
          {up.map((p) => <line key={"u" + p.n.name} x1={cx} y1={cy - 16} x2={p.x} y2={p.y + 12} />)}
          {down.map((p) => <line key={"d" + p.n.name} x1={cx} y1={cy + 16} x2={p.x} y2={p.y - 12} strokeDasharray={p.n.via === "statement" ? "4 3" : undefined} />)}
        </g>
        {[...up, ...down].map((p) => (
          <Link key={p.n.name} href={declHref(p.n.name)}>
            <g className="group">
              <title>{`${p.n.name} · cited by ${p.n.citedBy}`}</title>
              <circle cx={p.x} cy={p.y} r={6} className="fill-background stroke-foreground group-hover:fill-accent-ink" strokeWidth={1.5} />
              <text x={p.x} y={p.y < cy ? p.y - 12 : p.y + 22} textAnchor="middle" fontSize={11} className="fill-foreground" style={{ fontFamily: "var(--font-mono)" }}>
                {short(p.n.name)}
              </text>
            </g>
          </Link>
        ))}
        <rect x={cx - 110} y={cy - 16} width={220} height={32} rx={16} className="fill-foreground" />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize={13} className="fill-background" style={{ fontFamily: "var(--font-mono)" }}>
          {short(name, 30)}
        </text>
        <text x={12} y={cy - 40} fontSize={11} className="fill-muted-foreground" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}>CITED BY</text>
        <text x={12} y={cy + 48} fontSize={11} className="fill-muted-foreground" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}>CITES</text>
      </svg>
    </div>
  );
}
