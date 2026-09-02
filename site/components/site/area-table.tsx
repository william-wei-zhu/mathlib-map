import Link from "next/link";
import { areaHref, coverage, fmt, pct, type AreaSummary } from "@/lib/map-data";

/** Ranked table of every covered area: the table view of the map and the whole map on phones. */
export function AreaTable({ areas }: { areas: AreaSummary[] }) {
  const rows = areas.filter((a) => a.declarations > 0).sort((a, b) => b.declarations - a.declarations);
  const max = rows[0]?.declarations ?? 1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="eyebrow text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Area</th>
            <th className="py-2 pr-3 font-medium">Declarations</th>
            <th className="py-2 pr-3 font-medium">Famous theorems</th>
            <th className="py-2 font-medium">Open conjectures</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const c = coverage(a);
            return (
              <tr key={a.code} className="border-t border-border">
                <td className="py-2.5 pr-3">
                  <Link href={areaHref(a.code)} className="text-accent-ink underline underline-offset-4 hover:text-foreground">
                    <span className="lean">{a.code}</span> {a.short}
                  </Link>
                </td>
                <td className="py-2.5 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 rounded-full bg-accent-ink" style={{ width: `${Math.max(2, (a.declarations / max) * 100)}px` }} aria-hidden="true" />
                    <span className="tabular-nums text-foreground">{fmt(a.declarations)}</span>
                  </div>
                </td>
                <td className="py-2.5 pr-3 tabular-nums text-foreground">{c === null ? "none listed" : `${a.famous_mathlib} of ${a.famous_total} (${pct(c)})`}</td>
                <td className="py-2.5 tabular-nums text-foreground">{fmt(a.conjectures_open)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
