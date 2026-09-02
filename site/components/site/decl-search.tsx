"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { declHref, loogleHref, type SearchEntry } from "@/lib/atlas-data";
import { DATA_BASE_URL } from "@/lib/site";
import { KIND_LABEL } from "@/lib/atlas-data";

const EXAMPLES = ["Nat.exists_infinite_primes", "Real.sqrt", "IsCompact", "Polynomial.degree", "Nat.bertrand"];
const shardCache = new Map<string, Promise<SearchEntry[]>>();

function shardKey(q: string): string | null {
  // Words are split like the index: on whitespace, dots, and underscores.
  const tokens = q.toLowerCase().split(/[\s._]+/).filter(Boolean);
  const last = tokens[tokens.length - 1];
  if (!last || last.length < 2) return null;
  const k = last.slice(0, 2);
  return /^[a-z0-9]{2}$/.test(k) ? k : null;
}

function loadShard(k: string): Promise<SearchEntry[]> {
  if (!shardCache.has(k)) {
    shardCache.set(
      k,
      fetch(`${DATA_BASE_URL}/atlas/search/${k}.json`).then((r) => (r.ok ? (r.json() as Promise<SearchEntry[]>) : r.status === 404 ? [] : Promise.reject(new Error(String(r.status))))),
    );
  }
  return shardCache.get(k)!;
}

export function DeclSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const initial = params.get("q") ?? "";
  const [query, setQuery] = useState(initial);
  // The loaded shard is keyed by the query's shard key, so a stale shard is ignored on the next
  // render instead of being reset inside the effect.
  const [loaded, setLoaded] = useState<{ key: string; entries: SearchEntry[] | null; error: boolean } | null>(null);
  const key = shardKey(query);
  const current = loaded && key && loaded.key === key ? loaded : null;
  const entries = current?.entries ?? null;
  const status: "idle" | "loading" | "error" = current?.error ? "error" : key && !current ? "loading" : "idle";

  useEffect(() => {
    if (!key) return;
    let alive = true;
    loadShard(key)
      .then((e) => alive && setLoaded({ key, entries: e, error: false }))
      .catch(() => alive && setLoaded({ key, entries: null, error: true }));
    return () => {
      alive = false;
    };
  }, [key]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");
      const qs = next.toString();
      if (qs !== params.toString()) router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 300);
    return () => clearTimeout(t);
  }, [query, params, pathname, router]);

  const results = useMemo(() => {
    if (!entries || !query.trim()) return [];
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    return entries.filter(([name]) => {
      const lower = name.toLowerCase();
      return tokens.every((t) => lower.includes(t));
    }).slice(0, 60);
  }, [entries, query]);

  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()} className="flex gap-2">
        <label htmlFor="decl-q" className="sr-only">Declaration name</label>
        <input
          id="decl-q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Part of a name, e.g. infinite primes or Real.sqrt"
          spellCheck={false}
          autoCapitalize="off"
          autoFocus
          className="lean h-12 w-0 min-w-0 flex-1 rounded-full border border-input bg-card px-5 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </form>
      <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>Try</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => setQuery(ex)} className="lean inline-flex h-9 items-center rounded-full border border-foreground/40 px-3 text-sm text-foreground hover:border-foreground">{ex}</button>
        ))}
        <a href={loogleHref(query || "Nat.Prime")} target="_blank" rel="noopener noreferrer" className="text-accent-ink underline underline-offset-4 hover:text-foreground">Search by type on Loogle</a>
      </p>

      <div className="mt-8">
        {status === "error" ? (
          <p className="text-base text-foreground">The search index could not be loaded. Reload the page to try again.</p>
        ) : !query.trim() ? (
          <p className="text-base text-muted-foreground">Type part of a declaration name. Matching is case-insensitive and every word must appear.</p>
        ) : !key ? (
          <p className="text-base text-muted-foreground">Keep typing: at least two letters of a name part are needed.</p>
        ) : status === "loading" && !entries ? (
          <p className="eyebrow text-muted-foreground">Loading…</p>
        ) : results.length === 0 ? (
          <p className="text-base text-foreground">
            No declaration in this snapshot matches <span className="lean">{query}</span>. Names are Lean identifiers; try a shorter piece, or search by type on Loogle.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {results.map(([name, kind, cited]) => (
              <li key={name} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <Link href={declHref(name)} className="lean break-all text-sm text-accent-ink underline underline-offset-4 hover:text-foreground">{name}</Link>
                <span className="eyebrow min-w-0 break-words text-muted-foreground">{KIND_LABEL[kind] ?? kind} · cited by {cited.toLocaleString("en-US")}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
