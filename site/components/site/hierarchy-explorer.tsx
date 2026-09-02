"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { classHref } from "@/lib/data";
import { DIAGRAM_FAMILIES, FAMILY_LABELS } from "@/lib/families";
import { ancestors, descendants, loadGraph, typeClosure, type Graph } from "@/lib/hierarchy-client";
import { HierarchyDiagram } from "@/components/site/hierarchy-diagram";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

const DEFAULT_LIMIT = 80;

type State = { status: "loading" } | { status: "error" } | { status: "ready"; graph: Graph };

const pill = (active: boolean) =>
  cn(
    "eyebrow inline-flex h-10 items-center rounded-full border px-3.5 transition-colors",
    active ? "border-foreground bg-foreground text-background" : "border-foreground/40 text-foreground hover:border-foreground",
  );

export function HierarchyExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const family = params.get("family") ?? "Algebra";
  const focus = params.get("focus");
  const type = params.get("type");
  const showAll = params.get("all") === "1";

  const [state, setState] = useState<State>({ status: "loading" });
  const [classQuery, setClassQuery] = useState(focus ?? "");
  const [typeQuery, setTypeQuery] = useState(type ?? "");
  // The diagram renders into a full-canvas overlay (provided by AtlasShell on /hierarchy) so the
  // 80-node layout is legible, while these controls stay in the panel. Falls back to inline.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  // The overlay slot is rendered by AtlasShell (a different component), so it must be looked up from
  // the DOM after mount rather than via a ref.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSlot(document.getElementById("atlas-hierarchy-slot")); }, [state.status]);

  useEffect(() => {
    let alive = true;
    loadGraph()
      .then((graph) => alive && setState({ status: "ready", graph }))
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  const setParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  const graph = state.status === "ready" ? state.graph : null;

  const { ids, total, mode } = useMemo(() => {
    if (!graph) return { ids: [] as string[], total: 0, mode: "family" as const };
    if (focus && graph.byId.has(focus)) {
      const set = new Set<string>([focus, ...ancestors(graph, focus), ...descendants(graph, focus)]);
      const list = [...set].filter((id) => !graph.byId.get(id)?.hidden);
      return { ids: list, total: list.length, mode: "focus" as const };
    }
    const inFamily = graph.index.classes.filter((c) => c.family === family && !c.hidden && c.arity <= 1);
    inFamily.sort((a, b) => b.assumedBy + b.instances - (a.assumedBy + a.instances));
    const chosen = showAll ? inFamily : inFamily.slice(0, DEFAULT_LIMIT);
    return { ids: chosen.map((c) => c.id), total: inFamily.length, mode: "family" as const };
  }, [graph, family, focus, showAll]);

  const highlight = useMemo(() => (graph && type ? typeClosure(graph, type) : null), [graph, type]);
  const typeKnown = graph && type ? graph.typeDirect.has(type) : true;
  const focusKnown = graph && focus ? graph.byId.has(focus) : true;

  const classMatches = useMemo(() => {
    if (!graph || classQuery.length < 2) return [] as string[];
    const q = classQuery.toLowerCase();
    return graph.index.classes
      .filter((c) => !c.hidden && c.id.toLowerCase().includes(q))
      .sort((a, b) => a.id.length - b.id.length)
      .slice(0, 8)
      .map((c) => c.id);
  }, [graph, classQuery]);

  if (state.status === "loading") {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-border bg-card">
        <p className="eyebrow text-muted-foreground">Loading the hierarchy index…</p>
      </div>
    );
  }
  if (state.status === "error" || !graph) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <p className="text-base text-foreground">The hierarchy index could not be loaded.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex h-11 items-center rounded-full border border-foreground px-5 font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
        >
          Reload
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          {DIAGRAM_FAMILIES.map((f) => {
            const n = graph.index.families.find((x) => x.id === f)?.classes ?? 0;
            if (n === 0) return null;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setParams({ family: f, focus: null, all: null })}
                className={pill(mode === "family" && family === f)}
              >
                {FAMILY_LABELS[f]} <span className="ml-1.5 opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="grid gap-3 @lg:grid-cols-2">
          <form
            className="relative min-w-0"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ focus: classQuery.trim() || null, all: null });
              if (classQuery.trim()) track("hierarchy_focused", { length: classQuery.trim().length });
            }}
          >
            <label htmlFor="focus-class" className="eyebrow text-muted-foreground">Focus on a class</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="focus-class"
                value={classQuery}
                onChange={(e) => setClassQuery(e.target.value)}
                placeholder="Field, CompleteLattice, TopologicalSpace…"
                spellCheck={false}
                autoCapitalize="off"
                className="lean h-11 w-0 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="submit" className="inline-flex h-11 items-center rounded-full bg-foreground px-4 font-medium text-background hover:bg-foreground/90">
                Focus
              </button>
            </div>
            {classMatches.length > 0 && classQuery !== focus && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {classMatches.map((m) => (
                  <li key={m}>
                    <button
                      type="button"
                      onClick={() => {
                        setClassQuery(m);
                        setParams({ focus: m, all: null });
                      }}
                      className="lean inline-flex h-8 items-center rounded-full border border-foreground/40 px-2.5 text-xs text-foreground hover:border-foreground"
                    >
                      {m}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </form>
          <form
            className="min-w-0"
            onSubmit={(e) => {
              e.preventDefault();
              setParams({ type: typeQuery.trim() || null });
              if (typeQuery.trim()) track("hierarchy_type_lit", { length: typeQuery.trim().length });
            }}
          >
            <label htmlFor="highlight-type" className="eyebrow text-muted-foreground">Light up a concrete type</label>
            <div className="mt-1.5 flex gap-2">
              <input
                id="highlight-type"
                value={typeQuery}
                onChange={(e) => setTypeQuery(e.target.value)}
                placeholder="Real, Complex, Int, ZMod, Matrix…"
                spellCheck={false}
                autoCapitalize="off"
                className="lean h-11 w-0 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button type="submit" className="inline-flex h-11 items-center rounded-full border border-foreground px-4 font-medium text-foreground hover:bg-foreground hover:text-background">
                Light up
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-base text-foreground">
          {mode === "focus" && focus ? (
            <>
              Everything above and below <Link href={classHref(focus)} className="lean text-accent-ink underline underline-offset-4">{focus}</Link>: {total} classes.{" "}
              <button type="button" onClick={() => setParams({ focus: null })} className="text-accent-ink underline underline-offset-4">Back to {FAMILY_LABELS[family]}</button>
            </>
          ) : !focusKnown ? (
            <>
              <span className="lean">{focus}</span> is not a class in this index; showing {FAMILY_LABELS[family]} instead.
            </>
          ) : total > ids.length ? (
            <>
              The {ids.length} most used of {total} {FAMILY_LABELS[family].toLowerCase()} classes.{" "}
              <button type="button" onClick={() => setParams({ all: "1" })} className="text-accent-ink underline underline-offset-4">Show all {total}</button>
            </>
          ) : (
            <>All {total} {FAMILY_LABELS[family].toLowerCase()} classes with one type argument.</>
          )}
        </p>
        {type && (
          <p className="text-base text-foreground">
            {typeKnown && highlight ? (
              <>
                <span className="lean">{type}</span> satisfies {[...highlight].filter((c) => ids.includes(c)).length} of these ({highlight.size} overall).{" "}
              </>
            ) : (
              <>
                <span className="lean">{type}</span> is not a concrete type in this index.{" "}
              </>
            )}
            <button type="button" onClick={() => { setTypeQuery(""); setParams({ type: null }); }} className="text-accent-ink underline underline-offset-4">Clear</button>
          </p>
        )}
      </div>

      {(() => {
        const diagram = (
          <HierarchyDiagram graph={graph} ids={ids} focus={focus && graph.byId.has(focus) ? focus : null} highlight={typeKnown ? highlight : null} />
        );
        return slot ? createPortal(diagram, slot) : <div className="mt-4 h-[60vh]">{diagram}</div>;
      })()}
      <p className="eyebrow mt-3 text-muted-foreground">Solid: extends · Dashed: forgetful instance · More general classes sit higher</p>
    </div>
  );
}
