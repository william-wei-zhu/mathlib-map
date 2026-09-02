import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchShard } from "@/lib/data";
import { declHref, nodeShardPath, type NodePage } from "@/lib/atlas-data";
import { fmt } from "@/lib/map-data";
import { TOURS, tourBySlug } from "@/lib/tours";
import { DocText } from "@/components/site/doc-text";

type Params = { slug: string };

// Re-render every ten minutes so a shard uploaded after the build still shows up.
export const revalidate = 600;

export function generateStaticParams() {
  return TOURS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const tour = tourBySlug(slug);
  return { title: tour ? tour.title : "Tour", description: tour?.lede };
}

export default async function TourRoute({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const tour = tourBySlug(slug);
  if (!tour) notFound();
  const nodes = await Promise.all(tour.steps.map((s) => fetchShard<NodePage>(nodeShardPath(s.name))));

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="eyebrow text-accent-ink">
        <Link href="/search" className="underline underline-offset-4 hover:text-foreground">Theorems</Link> · Tour
      </p>
      <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-foreground sm:text-6xl">{tour.title}</h1>
      <p className="mt-5 text-lg text-foreground">{tour.lede}</p>

      <ol className="mt-12 space-y-10">
        {tour.steps.map((step, i) => {
          const node = nodes[i];
          return (
            <li key={step.name} id={`step-${i + 1}`} className="scroll-mt-6 border-t border-border pt-6">
              <p className="eyebrow text-muted-foreground">
                Step {i + 1} of {tour.steps.length}
                {node && <> · depth {fmt(node.depth)} · cited by {fmt(node.citedBy)}</>}
                {" · "}
                <a href={`#step-${i + 1}`} className="underline underline-offset-4 hover:text-foreground">link</a>
              </p>
              <h2 className="lean mt-2 break-words text-2xl font-medium text-foreground">
                <Link href={declHref(step.name)} className="hover:text-accent-ink">{step.name}</Link>
              </h2>
              <p className="mt-3 text-base text-foreground">{step.note}</p>
              {node ? (
                <>
                  <pre className="lean mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-card p-4 text-sm text-foreground">{node.statement}</pre>
                  {node.doc && <DocText text={node.doc.split(/\n\n/)[0]} className="mt-3 text-base text-muted-foreground" />}
                </>
              ) : (
                <p className="mt-4 text-base text-muted-foreground">This declaration is not in the current snapshot.</p>
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-12 border-t border-border pt-6 text-base text-foreground">
        Below the last step lie the natural numbers, propositional logic, and Lean&apos;s axioms. Open any step to keep descending on your own.
      </p>
    </div>
  );
}
