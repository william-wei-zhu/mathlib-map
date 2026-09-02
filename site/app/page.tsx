import Link from "next/link";
import { GITHUB_REPO_URL } from "@/lib/site";

const VIEWS = [
  {
    label: "Map",
    href: "/",
    title: "Which parts of mathematics are formalized, and how deeply.",
    body: "A zoomable map of mathematics. Each area is sized by how many Mathlib declarations it holds and colored by how many of its famous theorems are proved.",
    status: "Building",
  },
  {
    label: "Structures",
    href: "/hierarchy",
    title: "How Mathlib's algebraic and topological structures fit together.",
    body: "The typeclass hierarchy as one navigable diagram, from Monoid to Field and beyond, with a path finder that shows why a real number is an instance of any class.",
    status: "Live",
  },
  {
    label: "Theorems",
    href: "/search",
    title: "What each theorem cites, who cites it, and what it rests on.",
    body: "Every declaration with its statement, its dependencies down to the axioms, and the plumbing filtered out so only the mathematics shows.",
    status: "Building",
  },
] as const;

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <section className="max-w-3xl">
        <p className="eyebrow rise text-accent-ink">Lean 4 · Mathlib</p>
        <h1 className="rise mt-4 font-display text-5xl leading-[1.02] tracking-tight text-foreground sm:text-7xl" style={{ animationDelay: "80ms" }}>
          Every theorem in Mathlib, <em className="text-accent-ink">on the map</em>.
        </h1>
        <p className="rise mt-6 text-lg text-foreground" style={{ animationDelay: "160ms" }}>
          Mathlib holds more than 300,000 formal declarations of mathematics, checked by Lean.
          Mathlib Map shows where they are, how they fit together, and what each one rests on.
        </p>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        {VIEWS.map((v, i) => (
          <Link
            key={v.label}
            href={v.href}
            className="rise group flex flex-col rounded-lg border border-border bg-card p-6 transition-colors hover:border-foreground"
            style={{ animationDelay: `${240 + i * 80}ms` }}
          >
            <div className="flex items-center justify-between">
              <span className="eyebrow text-foreground">{v.label}</span>
              <span className="eyebrow rounded-full border border-border px-2.5 py-1 text-muted-foreground">
                {v.status}
              </span>
            </div>
            <h2 className="mt-4 font-display text-2xl leading-snug text-foreground">{v.title}</h2>
            <p className="mt-3 text-base text-foreground">{v.body}</p>
            <span className="mt-auto pt-6 text-accent-ink underline underline-offset-4 group-hover:text-foreground">
              Open {v.label}
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-16 flex flex-col items-start gap-4 border-t border-border pt-10 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-base text-foreground">
          This site is being built in the open. Structures is live; the Map and Theorems views
          are next.
        </p>
        <a
          href={GITHUB_REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center rounded-full border border-foreground px-5 font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          Follow the build on GitHub
        </a>
      </section>
    </div>
  );
}
