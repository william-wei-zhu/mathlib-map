import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { classHref, fetchShard, mathlibDocsHref, moduleDocsHref } from "@/lib/data";
import { KIND_LABEL, declHref, leanSearchHref, loogleHref, nodeShardPath, sourceHref, type Neighbor, type NodePage } from "@/lib/atlas-data";
import { areaHref, fmt } from "@/lib/map-data";
import { SNAPSHOT } from "@/lib/snapshot";
import { DocText } from "@/components/site/doc-text";
import { DependencyStar } from "@/components/site/dependency-star";
import { PagedList } from "@/components/site/paged-list";

type Params = { name: string };
const link = "text-accent-ink underline underline-offset-4 hover:text-foreground";

async function load(name: string): Promise<NodePage | null> {
  return fetchShard<NodePage>(nodeShardPath(name));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name } = await params;
  const id = decodeURIComponent(name);
  return { title: id, description: `${id} in Mathlib: its statement, what it cites, what cites it, and what it rests on.` };
}

function Section({ title, count, intro, children }: { title: string; count?: string; intro?: string; children: React.ReactNode }) {
  return (
    <section className="mt-12 border-t border-border pt-6">
      <h2 className="font-display text-2xl leading-none text-foreground">
        {title}
        {count && <span className="ml-3 text-muted-foreground">{count}</span>}
      </h2>
      {intro && <p className="mt-2 text-base text-muted-foreground">{intro}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function NeighborRow({ n }: { n: Neighbor }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <Link href={declHref(n.name)} className={`lean break-all text-sm ${link}`}>{n.name}</Link>
      <span className="eyebrow min-w-0 break-words text-muted-foreground">
        {n.via === "both" ? "statement and proof" : n.via} · cited by {fmt(n.citedBy)}
      </span>
    </div>
  );
}

const btn = "inline-flex h-11 items-center rounded-full border border-foreground/40 px-4 font-medium text-foreground transition-colors hover:border-foreground";

export default async function DeclRoute({ params }: { params: Promise<Params> }) {
  const { name } = await params;
  const id = decodeURIComponent(name);
  const page = await load(id);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="eyebrow text-accent-ink">
        <Link href="/search" className="underline underline-offset-4 hover:text-foreground">Theorems</Link>
        {" · "}
        {KIND_LABEL[page.kind] ?? page.kind}
        {page.area && (
          <>
            {" · "}
            <Link href={areaHref(page.area.code)} className="underline underline-offset-4 hover:text-foreground">{page.area.short}</Link>
          </>
        )}
      </p>
      <h1 className="lean mt-4 break-all text-lg @sm:text-xl @lg:text-2xl font-medium leading-tight tracking-tight text-foreground">{page.name}</h1>

      {page.deprecated && (
        <p className="mt-4 rounded-md border border-border bg-card p-4 text-base text-foreground">
          <span className="eyebrow mr-2 text-accent-ink">Deprecated{page.deprecated.since ? ` since ${page.deprecated.since}` : ""}</span>
          {page.deprecated.to ? (
            <>
              Use <Link href={declHref(page.deprecated.to)} className={`lean ${link}`}>{page.deprecated.to}</Link> instead.
            </>
          ) : (
            "Mathlib marks this declaration as deprecated."
          )}
        </p>
      )}

      {page.famous.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {page.famous.map((f) => (
            <li key={f} className="eyebrow inline-flex items-center rounded-full border border-accent-ink px-3 py-1.5 text-accent-ink">{f}</li>
          ))}
        </ul>
      )}

      <pre className="lean mt-6 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-border bg-card p-4 text-sm text-foreground">{page.statement}</pre>
      {page.doc && <DocText text={page.doc} className="mt-4 text-lg text-foreground" />}

      <dl className="mt-6 grid gap-x-8 gap-y-4 text-base @lg:grid-cols-2">
        {page.module && (
          <div>
            <dt className="eyebrow text-muted-foreground">Defined in</dt>
            <dd className="lean mt-1 break-all text-sm">
              <a href={moduleDocsHref(page.module)} target="_blank" rel="noopener noreferrer" className={link}>{page.module}</a>
            </dd>
          </div>
        )}
        <div>
          <dt className="eyebrow text-muted-foreground">Cited by</dt>
          <dd className="mt-1 text-foreground">{fmt(page.citedBy)} results in Mathlib</dd>
        </div>
        <div>
          <dt className="eyebrow text-muted-foreground">Foundations</dt>
          <dd className="mt-1 text-foreground">
            Depth {fmt(page.depth)} from the axioms
            {page.restsOnDefinitions !== null && <>, rests on {fmt(page.restsOnDefinitions)} definitions</>}
            {page.axioms.length > 0 ? (
              <>
                {" · uses "}
                <span className="lean">{page.axioms.join(", ")}</span>
              </>
            ) : (
              " · uses no axioms"
            )}
          </dd>
        </div>
        {page.assumes.length > 0 && (
          <div>
            <dt className="eyebrow text-muted-foreground">Assumes</dt>
            <dd className="mt-1 flex flex-wrap gap-1.5">
              {page.assumes.map((c) => (
                <Link key={c} href={classHref(c)} className="lean inline-flex h-8 items-center rounded-full border border-foreground/40 px-2.5 text-xs text-foreground hover:border-foreground">{c}</Link>
              ))}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <a href={mathlibDocsHref(page.name)} target="_blank" rel="noopener noreferrer" className={btn}>Mathlib docs</a>
        {page.module && <a href={sourceHref(page.module, SNAPSHOT.mathlibTag)} target="_blank" rel="noopener noreferrer" className={btn}>Source</a>}
        <a href={loogleHref(page.name)} target="_blank" rel="noopener noreferrer" className={btn}>Loogle</a>
        <a href={leanSearchHref(page.name)} target="_blank" rel="noopener noreferrer" className={btn}>LeanSearch</a>
      </div>

      <Section title="Around this declaration" intro="Dashed lines are statement dependencies; solid lines are citations in proofs.">
        <DependencyStar name={page.name} uses={page.uses} usedBy={page.usedBy} />
      </Section>

      <Section title="Cites" count={fmt(page.usesCount)} intro="Mathlib declarations this one mentions in its statement or cites explicitly in its proof. Plumbing is filtered out.">
        {page.uses.length === 0 ? <p className="text-base text-muted-foreground">Nothing in Mathlib beyond the foundations.</p> : <PagedList label="Cites" items={page.uses.map((n) => <NeighborRow key={n.name} n={n} />)} />}
        {page.usesCount > page.uses.length && <p className="eyebrow mt-3 text-muted-foreground">Showing the {page.uses.length} most cited of {fmt(page.usesCount)}.</p>}
      </Section>

      <Section title="Cited by" count={fmt(page.usedByCount)} intro="Results whose statement or proof uses this declaration.">
        {page.usedBy.length === 0 ? <p className="text-base text-muted-foreground">Nothing cites this yet.</p> : <PagedList label="Cited by" items={page.usedBy.map((n) => <NeighborRow key={n.name} n={n} />)} />}
        {page.usedByCount > page.usedBy.length && <p className="eyebrow mt-3 text-muted-foreground">Showing the {page.usedBy.length} most cited of {fmt(page.usedByCount)}.</p>}
      </Section>
    </div>
  );
}
