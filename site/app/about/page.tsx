import type { Metadata } from "next";
import { ProseSection } from "@/components/site/prose-section";
import { GITHUB_REPO_URL, INDEPENDENCE_LINE, SITE_URL } from "@/lib/site";
import { SNAPSHOT } from "@/lib/snapshot";

export const metadata: Metadata = {
  title: "About & data sources",
  description: "What Mathlib Map is, how the three views are built, where the data comes from, and how to cite it.",
};

const linkClass = "text-accent-ink underline underline-offset-4 hover:text-foreground";

const SOURCES = [
  ["MathNetwork / MathlibGraph", "Declaration dependency graph and network metrics", "MIT"],
  ["Mathlib Initiative / mathlib-types", "Statements and docstrings for every constant", "Apache 2.0"],
  ["Mathlib docs YAML files", "The 100 theorems, 1000+ theorems, overview, and undergraduate lists", "Apache 2.0"],
  ["1000+ theorems project", "MSC codes for famous theorems, the coverage denominator", "See project"],
  ["Formal Conjectures", "Conjecture statements with subject codes", "Apache 2.0"],
  ["MSC2020", "The Mathematics Subject Classification", "CC BY-NC-SA"],
  ["Our own Lean extractor", "Classes, instances, typeclass assumptions, explicit premises, axioms", "MIT"],
] as const;

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <p className="eyebrow text-accent-ink">About</p>
      <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-foreground sm:text-6xl">
        A map of formal mathematics, drawn from Mathlib itself.
      </h1>
      <p className="mt-6 text-lg text-foreground">
        Mathlib is the largest library of machine-checked mathematics in the world, and it is
        growing by thousands of results a month. Its shape is hard to see from the inside.
        Mathlib Map reads the library once a month and draws three views of it.
      </p>

      <ProseSection title="The three views">
        <p>
          <strong>Map</strong> places every area of mathematics on one page, sized by how many
          Mathlib declarations it holds and colored by how many of its famous theorems are
          proved. Every number shows its denominator.
        </p>
        <p>
          <strong>Structures</strong> is the typeclass hierarchy: which classes extend which,
          which concrete types are instances of what, and the chain of instances that connects
          them.
        </p>
        <p>
          <strong>Theorems</strong> gives every declaration a page with its statement, what it
          cites, what cites it, and what it rests on down to the axioms, with the elaborator
          plumbing filtered out so that only the mathematics shows.
        </p>
      </ProseSection>

      <ProseSection title="Where the data comes from">
        <p>
          Everything is derived from public data. The current snapshot describes Mathlib{" "}
          <span className="lean">{SNAPSHOT.mathlibTag}</span> ({SNAPSHOT.date}).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="eyebrow text-left text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Source</th>
                <th className="py-2 pr-4 font-medium">Gives</th>
                <th className="py-2 font-medium">License</th>
              </tr>
            </thead>
            <tbody>
              {SOURCES.map(([name, gives, license]) => (
                <tr key={name} className="border-t border-border align-top">
                  <td className="py-2 pr-4 text-foreground">{name}</td>
                  <td className="py-2 pr-4 text-foreground">{gives}</td>
                  <td className="py-2 text-foreground">{license}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          Derived datasets (the filtered dependency graph, citation counts, the module to subject
          mapping, and the hierarchy graph) will be published for download here once the first
          full pipeline run completes.
        </p>
      </ProseSection>

      <ProseSection title="Independence">
        <p>{INDEPENDENCE_LINE} The source is public on{" "}
          <a href={GITHUB_REPO_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
            GitHub
          </a>
          . Corrections and ideas are welcome as issues there.
        </p>
      </ProseSection>

      <ProseSection title="Cite">
        <p>If the site or its data is useful in your work:</p>
        <pre className="lean overflow-x-auto rounded-md border border-border bg-card p-4 text-sm text-foreground">{`@misc{mathlibmap,
  author = {William Zhu},
  title  = {Mathlib Map: every theorem in Mathlib, on the map},
  year   = {2026},
  url    = {${SITE_URL}}
}`}</pre>
      </ProseSection>
    </div>
  );
}
