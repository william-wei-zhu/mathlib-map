import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { classHref, fetchShard, mathlibDocsHref, moduleDocsHref } from "@/lib/data";
import { coverage, fmt, pct, shortName, type AreaPage } from "@/lib/map-data";
import { GITHUB_REPO_URL } from "@/lib/site";
import { PagedList } from "@/components/site/paged-list";
import { declHref } from "@/lib/atlas-data";

type Params = { msc: string };

const link = "text-accent-ink underline underline-offset-4 hover:text-foreground";

async function load(code: string): Promise<AreaPage | null> {
  if (!/^\d{2}$/.test(code)) return null;
  const raw = await fetchShard<AreaPage & { modules: number | AreaPage["files"] }>(`map/area/${code}.json`);
  if (!raw) return null;
  // Data written before the rename carried the file list under `modules`; the edge cache can
  // serve that shape for a while after an upload.
  if (Array.isArray(raw.modules)) {
    return { ...raw, files: raw.modules, modules: raw.modules.length };
  }
  return { ...raw, files: raw.files ?? [] };
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { msc } = await params;
  const page = await load(msc);
  return {
    title: page ? `${page.code} · ${page.label}` : "Area",
    description: page ? `${fmt(page.declarations)} Mathlib declarations in ${page.label.toLowerCase()}, with its famous theorems, open conjectures, and gaps.` : undefined,
  };
}

function Section({ title, count, children, intro }: { title: string; count?: string; intro?: string; children: React.ReactNode }) {
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

function reportHref(page: AreaPage): string {
  const title = encodeURIComponent(`Misclassified file in area ${page.code} (${page.label})`);
  const body = encodeURIComponent(`Area page: https://mathlibmap.com/area/${page.code}\n\nFile that looks misplaced:\n\nWhere it belongs (MSC code if you know it):\n`);
  return `${GITHUB_REPO_URL}/issues/new?title=${title}&body=${body}`;
}

export default async function AreaRoute({ params }: { params: Promise<Params> }) {
  const { msc } = await params;
  const page = await load(msc);
  if (!page) notFound();

  const cov = coverage(page);
  const famousDone = page.famous.filter((t) => t.mathlib);
  const famousMissing = page.famous.filter((t) => !t.mathlib);
  const openConj = page.conjectures.filter((c) => c.category === "open");
  const gaps = page.undergrad.filter((c) => c.missing > 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="eyebrow text-accent-ink">
        <Link href="/" className="underline underline-offset-4 hover:text-foreground">Map</Link> · <span className="lean">{page.code}</span>
      </p>
      <h1 className="mt-4 font-display text-2xl @sm:text-3xl @lg:text-4xl @2xl:text-5xl capitalize leading-tight tracking-tight text-foreground">{shortName(page)}</h1>
      <p className="eyebrow mt-3 text-muted-foreground">MSC {page.code} · {page.label}</p>
      <p className="mt-5 text-lg text-foreground">
        {fmt(page.declarations)} declarations ({fmt(page.theorems)} theorems, {fmt(page.definitions)} definitions) across {fmt(page.modules)} files.
        {page.famous_total > 0 ? (
          <> {page.famous_mathlib} of the {page.famous_total} famous theorems listed for this area are in Mathlib ({pct(cov ?? 0)}){page.famous_lean > page.famous_mathlib ? `, ${page.famous_lean} in some Lean library` : ""}.</>
        ) : (
          <> The 1000+ theorems list has no entries in this area.</>
        )}
        {page.conjectures_open > 0 && <> {fmt(page.conjectures_open)} open conjectures here are stated in Lean.</>}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Files are assigned to areas by a language model reading each file&apos;s documentation.{" "}
        <a href={reportHref(page)} target="_blank" rel="noopener noreferrer" className={link}>Report a file that is in the wrong area</a>.
      </p>

      {page.subareas.length > 0 && (
        <Section title="Subareas" count={String(page.subareas.length)}>
          <ul className="flex flex-wrap gap-2">
            {page.subareas.map((s) => (
              <li key={s.code} className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-sm text-foreground" title={`${s.modules} files`}>
                <span className="lean">{s.code}</span> {s.label} <span className="tabular-nums text-muted-foreground">{fmt(s.declarations)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {page.famous_total > 0 && (
        <Section title="Famous theorems" count={`${page.famous_mathlib} of ${page.famous_total}`} intro="From the 1000+ theorems project, which classifies each theorem by MSC area.">
          {famousMissing.length > 0 && (
            <>
              <p className="eyebrow mb-2 text-muted-foreground">Not yet in Mathlib · {famousMissing.length}</p>
              <PagedList
                label="Famous theorems not yet in Mathlib"
                items={famousMissing.map((t) => (
                  <div key={t.wikidata} className="flex flex-wrap items-baseline justify-between gap-2">
                    <a href={t.url} target="_blank" rel="noopener noreferrer" className={link}>{t.title}</a>
                    {t.lean && <span className="eyebrow text-muted-foreground">formalized outside Mathlib</span>}
                  </div>
                ))}
              />
            </>
          )}
          {famousDone.length > 0 && (
            <>
              <p className="eyebrow mb-2 mt-8 text-muted-foreground">In Mathlib · {famousDone.length}</p>
              <PagedList
                label="Famous theorems in Mathlib"
                items={famousDone.map((t) => (
                  <div key={t.wikidata} className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-foreground">{t.title}</span>
                    {t.decls[0] && (
                      <a href={mathlibDocsHref(t.decls[0])} target="_blank" rel="noopener noreferrer" className={`lean break-all text-sm ${link}`}>{t.decls[0]}</a>
                    )}
                  </div>
                ))}
              />
            </>
          )}
        </Section>
      )}

      {page.hundred.length > 0 && (
        <Section title="From the 100 theorems list" count={String(page.hundred.length)}>
          <ul className="grid gap-1.5 @lg:grid-cols-2">
            {page.hundred.map((t) => (
              <li key={t.number}>
                <a href={mathlibDocsHref(t.decl)} target="_blank" rel="noopener noreferrer" className={link}>{t.number}. {t.title}</a>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {openConj.length > 0 && (
        <Section title="Open conjectures stated in Lean" count={String(page.conjectures_open)} intro="Statements without proofs, collected by the Formal Conjectures project.">
          <PagedList
            label="Open conjectures"
            items={openConj.map((c) => (
              <div key={c.name} className="flex flex-wrap items-baseline justify-between gap-2">
                {c.url ? (
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className={`lean break-all text-sm ${link}`}>{c.name}</a>
                ) : (
                  <span className="lean break-all text-sm text-foreground">{c.name}</span>
                )}
                {c.collection && <span className="eyebrow text-muted-foreground">{c.collection}</span>}
              </div>
            ))}
          />
        </Section>
      )}

      {gaps.length > 0 && (
        <Section title="Undergraduate topics still missing" count={`${page.undergrad_missing} of ${page.undergrad_total}`} intro="From Mathlib's own undergraduate checklist.">
          {gaps.map((ch) => (
            <div key={ch.chapter} className="mb-5">
              <p className="eyebrow text-muted-foreground">{ch.chapter} · {ch.missing} of {ch.total}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {ch.missingTopics.map((t) => (
                  <li key={t} className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-sm text-foreground">{t}</li>
                ))}
              </ul>
            </div>
          ))}
        </Section>
      )}

      {page.topResults && page.topResults.length > 0 && (
        <Section title="Most cited results" count={String(page.topResults.length)} intro="Declarations in this area that other Mathlib results cite most.">
          <ul className="grid gap-1.5 @lg:grid-cols-2">
            {page.topResults.map((r) => (
              <li key={r.name} className="flex items-baseline justify-between gap-3">
                <Link href={declHref(r.name)} className={`lean min-w-0 break-all text-sm ${link}`}>{r.name}</Link>
                <span className="eyebrow min-w-0 break-words text-muted-foreground">{fmt(r.citedBy)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {page.classes.length > 0 && (
        <Section title="Structures defined here" count={String(page.classes.length)} intro="Typeclasses defined in this area's files, most assumed first.">
          <ul className="flex flex-wrap gap-2">
            {page.classes.map((c) => (
              <li key={c.id}>
                <Link href={classHref(c.id)} className="lean inline-flex h-10 items-center gap-2 rounded-full border border-foreground/40 px-3.5 text-sm text-foreground transition-colors hover:border-foreground">
                  {c.id} <span className="tabular-nums text-muted-foreground">{fmt(c.assumedBy)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Files" count={fmt(page.files.length)} intro="Largest first. The code after each file is its assigned subarea.">
        <PagedList
          label="Files"
          items={page.files.map((m) => (
            <div key={m.module} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <div className="min-w-0">
                <a href={moduleDocsHref(m.module)} target="_blank" rel="noopener noreferrer" className={`lean break-all text-sm ${link}`}>{m.module}</a>
                {m.title && <p className="text-sm text-foreground">{m.title}</p>}
              </div>
              <p className="eyebrow min-w-0 break-words text-muted-foreground">
                <span className="lean">{m.primary}</span> · {fmt(m.declarations)}
              </p>
            </div>
          ))}
        />
      </Section>
    </div>
  );
}
