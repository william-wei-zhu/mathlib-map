"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Search } from "lucide-react";
import { declHref } from "@/lib/atlas-data";
import { useDismiss } from "@/lib/use-dismiss";
import { track } from "@/lib/analytics";
import type { SearchResponse } from "@/app/api/search/route";

const short = (name: string) => name.split(".").slice(-2).join(".");

type Trace =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "found"; path: string[] }
  | { status: "none"; truncated: boolean }
  | { status: "error" };

/**
 * "How does this theorem rest on another result?" Runs a bounded proof-support search (server-side,
 * /api/path) from the current declaration down to a target the reader picks, and shows the chain.
 */
export function PathTrace({ from }: { from: string }) {
  const [q, setQ] = useState("");
  const [suggests, setSuggests] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [trace, setTrace] = useState<Trace>({ status: "idle" });
  const boxRef = useRef<HTMLDivElement>(null);
  useDismiss(boxRef, open, () => setOpen(false));

  // Autocomplete the target from the theorem search index.
  useEffect(() => {
    const query = q.trim();
    let alive = true;
    const t = setTimeout(async () => {
      if (query.length < 2 || query === target) { if (alive) setSuggests([]); return; }
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`);
        if (!res.ok) return;
        const data = (await res.json()) as SearchResponse;
        if (alive) setSuggests((data.theorems ?? []).map(([name]) => name));
      } catch { /* ignore */ }
    }, 180);
    return () => { alive = false; clearTimeout(t); };
  }, [q, target]);

  const run = async (to: string) => {
    setTarget(to);
    setQ(to);
    setOpen(false);
    setSuggests([]);
    if (to === from) { setTrace({ status: "found", path: [from] }); return; }
    setTrace({ status: "loading" });
    track("path_asked", { });
    try {
      const res = await fetch(`/api/path?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      if (!res.ok) { setTrace({ status: "error" }); return; }
      const data = (await res.json()) as { path: string[] | null; truncated?: boolean };
      if (data.path && data.path.length) setTrace({ status: "found", path: data.path });
      else setTrace({ status: "none", truncated: !!data.truncated });
    } catch {
      setTrace({ status: "error" });
    }
  };

  return (
    <div>
      <p className="text-base text-muted-foreground">
        Pick another result to see how <span className="lean text-foreground">{short(from)}</span> rests on it: a bounded search along
        proof and statement dependencies, meeting in the middle.
      </p>
      <div ref={boxRef} className="relative mt-3 max-w-md">
        <form
          onSubmit={(e) => { e.preventDefault(); const pick = suggests[0] ?? q.trim(); if (pick) run(pick); }}
          className="flex items-center gap-2 rounded-full border border-input bg-card px-4 py-2.5"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setTarget(null); }}
            onFocus={() => setOpen(true)}
            placeholder="Target result, e.g. Nat.Prime"
            spellCheck={false}
            autoCapitalize="off"
            className="lean w-full min-w-0 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Target declaration"
          />
          <button type="submit" className="eyebrow shrink-0 rounded-full bg-foreground px-3 py-1 text-background">Trace</button>
        </form>
        {open && suggests.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-10 mt-2 max-h-72 overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl">
            {suggests.map((s) => (
              <li key={s}>
                <button type="button" onClick={() => run(s)} className="lean block w-full truncate rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted">{s}</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-5">
        {trace.status === "loading" && <p className="eyebrow text-muted-foreground">Searching the dependency graph…</p>}
        {trace.status === "error" && <p className="text-base text-foreground">The path search is unavailable right now. Try again.</p>}
        {trace.status === "none" && (
          <p className="text-base text-foreground">
            No proof-support path found{trace.truncated ? " within the search budget" : ""}.{" "}
            <span className="text-muted-foreground">{target ? short(target) : "The target"} may not be among this declaration&apos;s foundations, or it sits deeper than the bounded search reaches.</span>
          </p>
        )}
        {trace.status === "found" && (
          <ol className="space-y-0">
            {trace.path.map((n, i) => (
              <li key={n}>
                {i > 0 && (
                  <div className="flex items-center gap-1.5 py-1 pl-1 text-muted-foreground">
                    <ArrowDown className="h-3.5 w-3.5" />
                    <span className="eyebrow">rests on</span>
                  </div>
                )}
                <Link
                  href={declHref(n)}
                  className={`lean block break-all rounded-lg border px-3 py-2 text-sm transition-colors ${i === 0 || i === trace.path.length - 1 ? "border-accent-ink text-foreground" : "border-border text-foreground hover:border-foreground"}`}
                >
                  {n}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
