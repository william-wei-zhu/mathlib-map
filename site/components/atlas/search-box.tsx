"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { areaHref, shortName, type AreaSummary } from "@/lib/map-data";
import { classHref } from "@/lib/data";
import { declHref, KIND_LABEL } from "@/lib/atlas-data";
import { useDismiss } from "@/lib/use-dismiss";
import { track } from "@/lib/analytics";
import type { SearchResponse } from "@/app/api/search/route";

type Result =
  | { kind: "area"; label: string; sub: string; href: string }
  | { kind: "structure"; label: string; sub: string; href: string }
  | { kind: "theorem"; label: string; sub: string; href: string };

async function apiResults(q: string): Promise<Result[]> {
  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`);
    if (!res.ok) return [];
    const data = (await res.json()) as SearchResponse;
    const structures: Result[] = (data.structures ?? []).map((c) => ({
      kind: "structure",
      label: c.id,
      sub: `Type class · ${c.family} · assumed by ${c.assumedBy.toLocaleString()}`,
      href: classHref(c.id),
    }));
    const theorems: Result[] = (data.theorems ?? []).map(([name, kind, cited]) => ({
      kind: "theorem",
      label: name,
      sub: `${KIND_LABEL[kind] ?? "Declaration"} · cited by ${cited.toLocaleString()}`,
      href: declHref(name),
    }));
    return [...structures, ...theorems];
  } catch {
    return [];
  }
}

export function SearchBox({ areas }: { areas: AreaSummary[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useDismiss(boxRef, open, () => setOpen(false));

  const areaResults = useMemo<Result[]>(() => {
    const l = q.trim().toLowerCase();
    if (l.length < 2) return [];
    return areas
      .filter((a) => a.label.toLowerCase().includes(l) || shortName(a).includes(l) || a.code.includes(l))
      .sort((a, b) => b.declarations - a.declarations)
      .slice(0, 5)
      .map((a) => ({ kind: "area" as const, label: `${shortName(a)}`, sub: `Area ${a.code} · ${a.declarations.toLocaleString()} declarations`, href: areaHref(a.code) }));
  }, [q, areas]);

  useEffect(() => {
    const query = q.trim();
    let alive = true;
    const t = setTimeout(async () => {
      if (query.length < 2) { if (alive) { setResults([]); setActive(-1); } return; }
      const rest = await apiResults(query);
      if (alive) { setResults([...areaResults, ...rest]); setActive(-1); }
    }, 180);
    return () => { alive = false; clearTimeout(t); };
  }, [q, areaResults]);

  // Focus search from anywhere with "/" (unless the user is already typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (r: Result) => {
    track("search_selected", { kind: r.kind });
    setOpen(false);
    setQ("");
    router.push(r.href);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setActive((i) => Math.min(results.length - 1, i + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(-1, i - 1)); }
    else if (e.key === "Enter") { const pick = results[active] ?? results[0]; if (pick) go(pick); }
    else if (e.key === "Escape") { setOpen(false); }
  };

  const badge = { area: "Area", structure: "Structure", theorem: "Theorem" } as const;

  return (
    <div ref={boxRef} className="relative w-full min-w-0">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-md">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search areas, structures, theorems"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="Search"
          spellCheck={false}
        />
        {q && (
          <button type="button" onClick={() => { setQ(""); setResults([]); inputRef.current?.focus(); }} aria-label="Clear" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">No matches yet. Keep typing.</li>
          ) : (
            results.map((r, i) => (
              <li key={`${r.kind}:${r.href}`}>
                <button
                  type="button"
                  onClick={() => go(r)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${i === active ? "bg-muted" : "hover:bg-muted"}`}
                >
                  <span className="eyebrow shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">{badge[r.kind]}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm text-foreground ${r.kind === "area" ? "" : "lean"}`}>{r.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.sub}</span>
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
