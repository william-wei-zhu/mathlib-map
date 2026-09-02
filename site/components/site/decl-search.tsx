"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { declHref, loogleHref, KIND_LABEL, type SearchEntry } from "@/lib/atlas-data";
import { track } from "@/lib/analytics";
import type { SearchResponse } from "@/app/api/search/route";

const EXAMPLES = ["Nat.exists_infinite_primes", "Real.sqrt", "IsCompact", "Polynomial.degree", "Nat.bertrand"];

export function DeclSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [results, setResults] = useState<SearchEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "short">("idle");
  const reqId = useRef(0);

  // Fetch matches from the server (it filters the multi-MB shard; the client never downloads it).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setResults([]); setStatus(q.length ? "short" : "idle"); return; }
    const id = ++reqId.current;
    setStatus("loading");
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=60`);
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SearchResponse;
        if (id !== reqId.current) return;
        setResults(data.theorems ?? []);
        setStatus("idle");
      } catch {
        if (id === reqId.current) setStatus("error");
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  // Keep ?q= in the URL so a search is shareable and survives reload.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (query.trim()) next.set("q", query.trim());
      else next.delete("q");
      const qs = next.toString();
      if (qs !== params.toString()) {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        if (query.trim().length >= 2) track("search_typed", { length: query.trim().length });
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query, params, pathname, router]);

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
        ) : status === "idle" && !query.trim() ? (
          <p className="text-base text-muted-foreground">Type part of a declaration name. Matching is case-insensitive and every word must appear.</p>
        ) : status === "short" ? (
          <p className="text-base text-muted-foreground">Keep typing: at least two letters of a name part are needed.</p>
        ) : status === "loading" ? (
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
