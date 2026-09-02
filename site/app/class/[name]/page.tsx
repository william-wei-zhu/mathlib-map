import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { classHref, fetchShard, mathlibDocsHref, moduleDocsHref, type ClassPage } from "@/lib/data";
import { FAMILY_LABELS } from "@/lib/families";
import { PathFinder } from "@/components/site/path-finder";
import { DocText } from "@/components/site/doc-text";
import { declHref } from "@/lib/atlas-data";

type Params = { name: string };

async function load(name: string): Promise<ClassPage | null> {
  return fetchShard<ClassPage>(`hierarchy/classes/${encodeURIComponent(name)}.json`);
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { name } = await params;
  const id = decodeURIComponent(name);
  return {
    title: id,
    description: `${id} in Mathlib: what it extends, what extends it, which types are instances, and which results assume it.`,
  };
}

function Pills({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-base text-muted-foreground">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((c) => (
        <li key={c}>
          <Link
            href={classHref(c)}
            className="lean inline-flex h-10 items-center rounded-full border border-foreground/40 px-3.5 text-sm text-foreground transition-colors hover:border-foreground"
          >
            {c}
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="mt-10 border-t border-border pt-6">
      <h2 className="font-display text-2xl leading-none text-foreground">
        {title}
        {typeof count === "number" && <span className="ml-3 text-muted-foreground">{count.toLocaleString()}</span>}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function ClassPageRoute({ params }: { params: Promise<Params> }) {
  const { name } = await params;
  const id = decodeURIComponent(name);
  const page = await load(id);
  if (!page) notFound();

  const familyLabel = FAMILY_LABELS[page.family] ?? page.family;
  const parents = page.parents.map((p) => p.name);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="eyebrow text-accent-ink">
        <Link href="/hierarchy" className="underline underline-offset-4 hover:text-foreground">Structures</Link>
        {" · "}
        {familyLabel}
      </p>
      <h1 className="lean mt-4 break-all text-lg @sm:text-xl @lg:text-2xl font-medium leading-tight tracking-tight text-foreground">
        {page.id}
      </h1>
      {page.doc ? (
        <DocText text={page.doc} className="mt-5 text-lg text-foreground" />
      ) : (
        <p className="mt-5 text-lg text-muted-foreground">This class has no docstring in Mathlib.</p>
      )}
      <dl className="mt-6 grid gap-x-8 gap-y-3 text-base @lg:grid-cols-2">
        {page.module && (
          <div>
            <dt className="eyebrow text-muted-foreground">Defined in</dt>
            <dd className="lean mt-1 break-all text-sm">
              <a href={moduleDocsHref(page.module)} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline underline-offset-4 hover:text-foreground">
                {page.module}
              </a>
            </dd>
          </div>
        )}
        <div>
          <dt className="eyebrow text-muted-foreground">Shape</dt>
          <dd className="mt-1 text-sm text-foreground">
            {page.arity === 1 ? "One type argument" : `${page.arity} explicit arguments`}
            {page.isStructure ? "" : ", not a structure"}
            {page.ownFields.length > 0 && (
              <>
                {" · adds "}
                <span className="lean">{page.ownFields.join(", ")}</span>
              </>
            )}
          </dd>
        </div>
      </dl>
      <div className="mt-6">
        <a
          href={mathlibDocsHref(page.id)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center rounded-full border border-foreground px-5 font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          Open in Mathlib docs
        </a>
      </div>

      <Section title="Extends" count={parents.length}>
        <Pills items={parents} empty="Extends nothing: this is a root of the hierarchy." />
      </Section>
      <Section title="Extended by" count={page.children.length}>
        <Pills items={page.children} empty="Nothing extends this class yet." />
      </Section>
      {(page.forgetfulOut.length > 0 || page.forgetfulIn.length > 0) && (
        <Section title="Forgetful instances">
          {page.forgetfulOut.length > 0 && (
            <>
              <p className="eyebrow mb-2 text-muted-foreground">Every {page.id} is also a</p>
              <Pills items={page.forgetfulOut} empty="" />
            </>
          )}
          {page.forgetfulIn.length > 0 && (
            <>
              <p className="eyebrow mb-2 mt-5 text-muted-foreground">Provided automatically by</p>
              <Pills items={page.forgetfulIn} empty="" />
            </>
          )}
        </Section>
      )}
      <Section title="Concrete types that are instances" count={page.concreteTypes.length}>
        {page.concreteTypes.length === 0 ? (
          <p className="text-base text-muted-foreground">No instance on a concrete type; it is reached through other classes.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {page.concreteTypes.map((t) => (
              <li key={t.type} className="lean inline-flex h-10 items-center rounded-full border border-border bg-card px-3.5 text-sm text-foreground" title={t.instances.join(", ")}>
                {t.type}
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="How is a type an instance?">
        <PathFinder target={page.id} />
      </Section>
      <Section title="Assumed by" count={page.assumedBy.count}>
        {page.assumedBy.count === 0 ? (
          <p className="text-base text-muted-foreground">No theorem or definition in Mathlib takes this class as a hypothesis.</p>
        ) : (
          <ul className="grid gap-1.5 @lg:grid-cols-2">
            {page.assumedBy.sample.map((d) => (
              <li key={d}>
                <Link href={declHref(d)} className="lean break-all text-sm text-accent-ink underline underline-offset-4 hover:text-foreground">
                  {d}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Ancestors" count={page.ancestors.length}>
        <Pills items={page.ancestors} empty="No ancestors." />
      </Section>
    </div>
  );
}
