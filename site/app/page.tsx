import Link from "next/link";
import { fetchShard } from "@/lib/data";
import { GITHUB_REPO_URL } from "@/lib/site";
import { coverage, fmt, pct, shortName, type MapIndex } from "@/lib/map-data";
import { FrontierMap } from "@/components/site/frontier-map";
import { AreaTable } from "@/components/site/area-table";

const VIEWS = [
  {
    label: "Map",
    href: "/#map",
    title: "Which parts of mathematics are formalized, and how deeply.",
    body: "Every area of mathematics, sized by how many Mathlib declarations it holds and colored by how many of its famous theorems are proved.",
  },
  {
    label: "Structures",
    href: "/hierarchy",
    title: "How Mathlib's algebraic and topological structures fit together.",
    body: "The typeclass hierarchy as one navigable diagram, from Monoid to Field and beyond, with a chain finder that shows why a real number is an instance of any class.",
  },
  {
    label: "Theorems",
    href: "/search",
    title: "What each theorem cites, who cites it, and what it rests on.",
    body: "Every declaration with its statement, its dependencies down to the axioms, and the plumbing filtered out so only the mathematics shows.",
  },
] as const;

function Headline({ index }: { index: MapIndex }) {
  const byCode = new Map(index.areas.map((a) => [a.code, a]));
  const deepest = index.headline.deepest.map((c) => byCode.get(c)).filter(Boolean);
  const gap = index.headline.widestGap ? byCode.get(index.headline.widestGap) : null;
  const t = index.totals;
  const overall = t.famous_total > 0 ? t.famous_mathlib / t.famous_total : 0;
  const names = deepest.map((a) => shortName(a!));
  const list = names.length === 3 ? `${names[0]}, ${names[1]}, and ${names[2]}` : names.join(", ");
  return (
    <p className="mt-6 max-w-3xl text-lg text-foreground">
      Mathlib is deepest in {list}. It has formalized {fmt(t.famous_mathlib)} of the {fmt(t.famous_total)} theorems on the 1000+ list ({pct(overall)}), and touches {t.areas_covered} of the {t.areas_total} areas of mathematics.
      {gap && (
        <>
          {" "}The widest gap is {shortName(gap)}: {gap.famous_mathlib} of its {gap.famous_total} famous theorems are in Mathlib ({pct(coverage(gap) ?? 0)}).
        </>
      )}
    </p>
  );
}

export default async function HomePage() {
  const index = await fetchShard<MapIndex>("map/index.json");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="max-w-3xl">
        <p className="eyebrow rise text-accent-ink">Lean 4 · Mathlib</p>
        <h1 className="rise mt-4 font-display text-5xl leading-[1.02] tracking-tight text-foreground sm:text-7xl" style={{ animationDelay: "80ms" }}>
          Every theorem in Mathlib, <em className="text-accent-ink">on the map</em>.
        </h1>
        {index ? (
          <div className="rise" style={{ animationDelay: "160ms" }}>
            <Headline index={index} />
          </div>
        ) : (
          <p className="rise mt-6 text-lg text-foreground" style={{ animationDelay: "160ms" }}>
            Mathlib holds more than 300,000 formal declarations of mathematics, checked by Lean.
            Mathlib Map shows where they are, how they fit together, and what each one rests on.
          </p>
        )}
      </section>

      {index && (
        <section id="map" className="rise mt-12 scroll-mt-6" style={{ animationDelay: "240ms" }}>
          <h2 className="font-display text-3xl leading-tight text-foreground">The map of formalized mathematics</h2>
          <p className="mt-2 max-w-2xl text-base text-foreground">
            Each tile is an area of the Mathematics Subject Classification. Areas with no Mathlib
            declarations are not drawn. Click a tile to zoom in and open its page.
          </p>
          <div className="mt-6">
            <FrontierMap index={index} />
          </div>
          <div className="mt-8">
            <h3 className="eyebrow text-muted-foreground">Every area, ranked by declarations</h3>
            <div className="mt-3">
              <AreaTable areas={index.areas} />
            </div>
          </div>
        </section>
      )}

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {VIEWS.map((v) => (
          <Link key={v.label} href={v.href} className="group flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground">
            <span className="eyebrow text-foreground">{v.label}</span>
            <h2 className="mt-4 font-display text-2xl leading-snug text-foreground">{v.title}</h2>
            <p className="mt-3 text-base text-foreground">{v.body}</p>
            <span className="mt-auto pt-6 text-accent-ink underline underline-offset-4 group-hover:text-foreground">Open {v.label}</span>
          </Link>
        ))}
      </section>

      <section className="mt-16 flex flex-col items-start gap-4 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-base text-foreground">
          This site is being built in the open. Map and Structures are live; Theorems is next.
        </p>
        <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-full border border-foreground px-5 font-medium text-foreground transition-colors hover:bg-foreground hover:text-background">
          Follow the build on GitHub
        </a>
      </section>
    </div>
  );
}
