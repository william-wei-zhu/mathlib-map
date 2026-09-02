"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 12;

/** Windowed page numbers: first, last, and a window around the current page. */
function pageList(current: number, count: number): (number | "…")[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set<number>([1, count, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap === 2) out.push(sorted[i] - 1);
      else if (gap > 2) out.push("…");
    }
    out.push(sorted[i]);
  }
  return out;
}

/** Twelve rows per page, Prev · 1 2 3 … · Next, range shown, scrolls to the list top on change. */
export function PagedList({ items, label }: { items: ReactNode[]; label: string }) {
  const [page, setPage] = useState(1);
  const topRef = useRef<HTMLDivElement>(null);
  const count = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, count);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = items.slice(start, start + PAGE_SIZE);
  const lastLen = useRef(items.length);

  useEffect(() => {
    if (lastLen.current !== items.length) {
      lastLen.current = items.length;
      setPage(1);
    }
  }, [items.length]);

  const go = (p: number) => {
    setPage(Math.max(1, Math.min(count, p)));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (items.length === 0) return null;

  const btn = "inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm transition-colors";
  return (
    <div>
      <div ref={topRef} className="scroll-mt-6" />
      <ul className="divide-y divide-border">{visible.map((node, i) => <li key={start + i} className="py-3">{node}</li>)}</ul>
      {count > 1 && (
        <nav aria-label={`${label} pages`} className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-between">
          <p className="eyebrow w-full text-center text-muted-foreground sm:w-auto sm:text-left">
            {String(start + 1).padStart(2, "0")}–{String(Math.min(start + PAGE_SIZE, items.length)).padStart(2, "0")} of {items.length}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button type="button" onClick={() => go(safePage - 1)} disabled={safePage === 1} aria-label="Previous page" className={cn(btn, "border-foreground/40 text-foreground disabled:opacity-40")}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageList(safePage, count).map((p, i) =>
              p === "…" ? (
                <span key={`e${i}`} className="px-1 text-muted-foreground">…</span>
              ) : (
                <button key={p} type="button" onClick={() => go(p)} aria-current={p === safePage ? "page" : undefined} className={cn(btn, p === safePage ? "border-foreground bg-foreground text-background" : "border-foreground/40 text-foreground hover:border-foreground")}>
                  {p}
                </button>
              ),
            )}
            <button type="button" onClick={() => go(safePage + 1)} disabled={safePage === count} aria-label="Next page" className={cn(btn, "border-foreground/40 text-foreground disabled:opacity-40")}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}
