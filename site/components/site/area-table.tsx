import Link from "next/link";
import { areaHref, coverage, fmt, pct, shortName, type AreaSummary } from "@/lib/map-data";

/** Ranked table of every covered area: the table view of the map and the whole map on phones. */
export function AreaTable({ areas }: { areas: AreaSummary[] }) {
  const rows = areas.filter((a) => a.declarations > 0).sort((a, b) => b.declarations - a.declarations);
  const max = rows[0]?.declarations ?? 1;
  return (
    <div>
      {/* Phones: one stacked entry per area instead of a four-column table. */}
      <ul className="divide-y divide-border sm:hidden">
        {rows.map((a) => {
          const c = coverage(a);
          return (
            <li key={a.code} className="py-3">
              <Link href={areaHref(a.code)} className="text-accent-ink underline underline-offset-4 hover:text-foreground">
                <span className="lean">{a.code}</span> {shortName(a)}
              </Link>
              <p className="mt-1 text-sm text-foreground">
                <span className="tabular-nums">{fmt(a.declarations)}</span> declarations
                {" · "}
                {c === null ? "no famous theorems listed" : `${a.famous_mathlib} of ${a.famous_total} famous theorems (${pct(c)})`}
                {a.conjectures_open > 0 && <> · {fmt(a.conjectures_open)} open conjectures</>}
              </p>
            </li>
          );
        })}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
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
                    <span className="lean">{a.code}</span> {shortName(a)}
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
    </div>
  );
}
