import type { Metadata } from "next";
import { Reveal } from "@/components/site/reveal";
import { ClassifyArt, FilterArt, MeasureArt, PipelineArt, PublishArt, ReadArt } from "@/components/site/docs-art";
import { GITHUB_REPO_URL } from "@/lib/site";

// Unlisted: not linked anywhere, not in the sitemap, not indexed. Architecture only, no secrets.
export const metadata: Metadata = {
  title: "How it works",
  description: "What happens between a Mathlib release and a page on Mathlib Map.",
  robots: { index: false, follow: false },
};

const ACTS = [
  {
    title: "Read Mathlib",
    words: "A small Lean program imports all of Mathlib and walks its environment: every class, every instance, and for every constant the constants its statement and proof use.",
    tech: "lake exe extractor · Lean 4.33.0 · 771,129 constants in 80 s · 7 GB RAM",
    Art: ReadArt,
  },
  {
    title: "Keep the mathematics",
    words: "Most dependency edges are plumbing the elaborator inserted. Only a name that appears in a statement, or in an explicit position of a proof, counts as a citation.",
    tech: "syntactic explicitness from binder kinds · 8.4M raw edges → 3.18M · instances and tooling dropped",
    Art: FilterArt,
  },
  {
    title: "Classify every file",
    words: "A language model reads each file's own documentation and assigns a subject area. Results are cached by content, so a monthly rerun only pays for changed files.",
    tech: "gemini-3.1-flash-lite on Vertex AI · temperature 0 · JSON schema · 7,751 files · 73% agreement with the 1000+ list",
    Art: ClassifyArt,
  },
  {
    title: "Rank and measure",
    words: "Citation counts and PageRank order every list. Axioms and depth are propagated over the full graph so they stay exact, with reference cycles condensed away first.",
    tech: "scipy sparse · OR-propagation to a fixpoint · longest path on the SCC condensation · max depth 361",
    Art: MeasureArt,
  },
  {
    title: "Publish",
    words: "Everything becomes small JSON files in a public bucket. The site fetches the one file a page needs; no database, no Lean at request time.",
    tech: "Google Cloud Storage · gzip at rest · 10-minute caches · Next.js 16 on Vercel · elkjs, d3-zoom, d3-hierarchy",
    Art: PublishArt,
  },
] as const;

const STACK = [
  ["Proof assistant", "Lean 4.33.0 · Mathlib v4.33.0 (pinned tag)"],
  ["Extractor", "Lean 4 Lake project, importModules with extensions loaded"],
  ["Pipeline", "Python 3.12 · uv · numpy · scipy · pandas"],
  ["Classification", "Gemini 3.1 Flash Lite · Vertex AI, global endpoint · structured output"],
  ["Data", "Google Cloud Storage, public-read bucket, Content-Encoding gzip"],
  ["Site", "Next.js 16 App Router · React · Tailwind v4 · Vercel"],
  ["Diagrams", "elkjs layered layout · d3-zoom · d3-hierarchy treemap"],
  ["Refresh", "GitHub Actions, monthly, with a dry-run switch"],
] as const;

const NOTES = [
  "Theorem proofs are invisible to the extractor unless values are read with allowOpaque; the first run produced empty proofs for every theorem.",
  "Lean's environment has reference cycles (a structure and its recursor). Longest-path depth is computed on the strongly connected condensation; the naive version inflated everything above a cycle to the iteration cap.",
  "Explicitness is decided from the head constant's binder kinds, not by inferring types at every application; that is what makes a full-library pass take minutes instead of hours.",
  "Two caches sit between an upload and a page: the bucket's edge cache and Next's data cache. Both are set to ten minutes, and the UI tolerates a field that has not arrived yet.",
  "Declaration names carry primes and parentheses. The pipeline and the site share one percent-encoding rule so a shard path is identical on both sides.",
] as const;

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="eyebrow text-accent-ink">How it works</p>
      <h1 className="mt-4 font-display text-2xl @sm:text-3xl @lg:text-4xl @2xl:text-5xl leading-tight tracking-tight text-foreground">
        From a Mathlib release to a page, in five acts.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-foreground">
        Once per release, a Lean program reads the library, a Python pipeline turns what it finds into
        small files, and the site reads one file per page. Nothing runs Lean while you browse.
      </p>

      <Reveal className="mt-10 rounded-lg border border-border bg-card p-4 sm:p-6">
        <PipelineArt />
      </Reveal>

      <ol className="mt-16 space-y-16">
        {ACTS.map((act, i) => (
          <li key={act.title}>
            <Reveal>
              <div className={`grid items-center gap-8 @lg:grid-cols-2 ${i % 2 === 1 ? "sm:[&>*:first-child]:order-last" : ""}`}>
                <div className="rounded-lg border border-border bg-card p-4">
                  <act.Art />
                </div>
                <div>
                  <p className="eyebrow text-muted-foreground">Act {i + 1}</p>
                  <h2 className="mt-2 font-display text-3xl leading-tight text-foreground">{act.title}</h2>
                  <p className="mt-3 text-base text-foreground">{act.words}</p>
                  <p className="eyebrow mt-4 !tracking-[0.08em] text-accent-ink">{act.tech}</p>
                </div>
              </div>
            </Reveal>
          </li>
        ))}
      </ol>

      <Reveal className="mt-16 border-t border-border pt-8">
        <h2 className="font-display text-3xl leading-tight text-foreground">What it runs on</h2>
        <dl className="mt-6 grid gap-4 @lg:grid-cols-2">
          {STACK.map(([k, v]) => (
            <div key={k} className="rounded-lg border border-border bg-card p-4">
              <dt className="eyebrow text-muted-foreground">{k}</dt>
              <dd className="mt-1 text-base text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal className="mt-16 border-t border-border pt-8">
        <h2 className="font-display text-3xl leading-tight text-foreground">Notes for engineers</h2>
        <ul className="mt-6 space-y-3">
          {NOTES.map((n) => (
            <li key={n} className="flex gap-3 text-base text-foreground">
              <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-accent-ink" aria-hidden="true" />
              <span>{n}</span>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-base text-foreground">
          Everything above is in the open at{" "}
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline underline-offset-4 hover:text-foreground">GitHub</a>
          , including the runbooks in <span className="lean">docs/</span>.
        </p>
      </Reveal>
    </div>
  );
}
