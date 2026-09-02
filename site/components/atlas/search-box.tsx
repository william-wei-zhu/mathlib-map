"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { DATA_BASE_URL } from "@/lib/site";
import { areaHref, shortName, type AreaSummary } from "@/lib/map-data";
import { classHref, type HierarchyIndex } from "@/lib/data";
import { declHref, KIND_LABEL, type SearchEntry } from "@/lib/atlas-data";
import { track } from "@/lib/analytics";

type Result =
  | { kind: "area"; label: string; sub: string; href: string }
  | { kind: "structure"; label: string; sub: string; href: string }
  | { kind: "theorem"; label: string; sub: string; href: string };

const shardCache = new Map<string, SearchEntry[]>();
let classCache: HierarchyIndex["classes"] | null = null;

function shardKey(q: string): string | null {
  const tokens = q.toLowerCase().split(/[\s._]+/).filter(Boolean);
  const last = tokens[tokens.length - 1];
  if (!last || last.length < 2) return null;
  const k = last.slice(0, 2);
  return /^[a-z0-9]{2}$/.test(k) ? k : null;
}

async function declResults(q: string): Promise<Result[]> {
  const k = shardKey(q);
  if (!k) return [];
  let entries = shardCache.get(k);
  if (!entries) {
    try {
      const res = await fetch(`${DATA_BASE_URL}/atlas/search/${k}.json`);
      entries = res.ok ? ((await res.json()) as SearchEntry[]) : [];
    } catch {
      entries = [];
    }
    shardCache.set(k, entries);
  }
  const tokens = q.toLowerCase().split(/[\s._]+/).filter(Boolean);
  return entries
    .filter(([name]) => { const l = name.toLowerCase(); return tokens.every((t) => l.includes(t)); })
    .sort((a, b) => b[2] - a[2])
    .slice(0, 8)
    .map(([name, kind, cited]) => ({ kind: "theorem" as const, label: name, sub: `${KIND_LABEL[kind] ?? "Declaration"} · cited by ${cited.toLocaleString()}`, href: declHref(name) }));
}

async function classResults(q: string): Promise<Result[]> {
  if (!classCache) {
    try {
      const res = await fetch(`${DATA_BASE_URL}/hierarchy/index.json`);
      classCache = res.ok ? ((await res.json()) as HierarchyIndex).classes : [];
    } catch {
      classCache = [];
    }
  }
  const l = q.toLowerCase();
  return classCache
    .filter((c) => !c.hidden && c.id.toLowerCase().includes(l))
    .sort((a, b) => b.assumedBy - a.assumedBy)
    .slice(0, 6)
    .map((c) => ({ kind: "structure" as const, label: c.id, sub: `Type class · ${c.family} · assumed by ${c.assumedBy.toLocaleString()}`, href: classHref(c.id) }));
}

export function SearchBox({ areas }: { areas: AreaSummary[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);

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
    if (query.length < 2) { setResults([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      const [decls, classes] = await Promise.all([declResults(query), classResults(query)]);
      if (alive) setResults([...areaResults, ...classes, ...decls]);
    }, 180);
    return () => { alive = false; clearTimeout(t); };
  }, [q, areaResults]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const go = (r: Result) => {
    track("search_selected", { kind: r.kind });
    setOpen(false);
    setQ("");
    router.push(r.href);
  };

  const badge = { area: "Area", structure: "Structure", theorem: "Theorem" } as const;

  return (
    <div ref={boxRef} className="relative w-full min-w-0">
      <div className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 shadow-md">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === "Enter" && results[0]) go(results[0]); if (e.key === "Escape") setOpen(false); }}
          placeholder="Search areas, structures, theorems"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="Search"
          spellCheck={false}
        />
        {q && (
          <button type="button" onClick={() => { setQ(""); setResults([]); }} aria-label="Clear" className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && q.trim().length >= 2 && (
        <ul className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-card p-1.5 shadow-xl">
          {results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted-foreground">No matches yet. Keep typing.</li>
          ) : (
            results.map((r) => (
              <li key={`${r.kind}:${r.href}`}>
                <button type="button" onClick={() => go(r)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-muted">
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
