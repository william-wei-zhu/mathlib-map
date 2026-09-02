"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { classHref, mathlibDocsHref } from "@/lib/data";
import { findPath, loadGraph, typesReaching, type Graph, type Hop } from "@/lib/hierarchy-client";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; graph: Graph };

/** "How is X an instance of <target>?" Renders the chain of instances, hop by hop. */
export function PathFinder({ target, initial }: { target: string; initial?: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [query, setQuery] = useState(initial ?? "");
  const [asked, setAsked] = useState<string | null>(initial ?? null);

  useEffect(() => {
    let alive = true;
    loadGraph()
      .then((graph) => alive && setState({ status: "ready", graph }))
      .catch(() => alive && setState({ status: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  if (state.status === "loading") {
    return <p className="text-base text-muted-foreground">Loading the hierarchy index…</p>;
  }
  if (state.status === "error") {
    return (
      <p className="text-base text-foreground">
        The hierarchy index could not be loaded. Reload the page to try again.
      </p>
    );
  }

  const { graph } = state;
  const suggestions = typesReaching(graph, target).map((t) => t.id);
  const trimmed = asked?.trim() ?? "";
  const result: Hop[] | null | undefined = trimmed ? findPath(graph, trimmed, target) : undefined;
  const known = trimmed ? graph.typeDirect.has(trimmed) || graph.byId.has(trimmed) : true;

  return (
    <div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setAsked(query);
          if (query.trim()) track("path_asked", { length: query.trim().length });
        }}
      >
        <label className="sr-only" htmlFor="path-start">Type or class name</label>
        <input
          id="path-start"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="A type such as Real, or a class"
          spellCheck={false}
          autoCapitalize="off"
          className="lean h-11 w-0 min-w-0 flex-1 rounded-full border border-input bg-card px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-full bg-foreground px-5 font-medium text-background transition-colors hover:bg-foreground/90"
        >
          Show the chain
        </button>
      </form>
      {suggestions.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Try</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setQuery(s);
                setAsked(s);
              }}
              className={cn(
                "lean inline-flex h-9 items-center rounded-full border px-3 text-sm transition-colors",
                asked === s ? "border-foreground bg-foreground text-background" : "border-foreground/40 text-foreground hover:border-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </p>
      )}

      {result === undefined ? null : !known ? (
        <p className="mt-5 text-base text-foreground">
          <span className="lean">{trimmed}</span> is not a type or class in this index. Names are
          case-sensitive Lean identifiers, for example <span className="lean">Real</span> or{" "}
          <span className="lean">Polynomial</span>.
        </p>
      ) : result === null ? (
        <p className="mt-5 text-base text-foreground">
          No chain of instances leads from <span className="lean">{trimmed}</span> to{" "}
          <span className="lean">{target}</span> in this snapshot.
        </p>
      ) : result.length === 0 ? (
        <p className="mt-5 text-base text-foreground">
          <span className="lean">{trimmed}</span> is <span className="lean">{target}</span> itself.
        </p>
      ) : (
        <ol className="mt-5 space-y-2">
          <li className="lean text-sm text-foreground">{trimmed}</li>
          {result.map((h, i) => (
            <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="eyebrow text-muted-foreground">
                {h.kind === "instance" ? "instance" : h.kind === "extends" ? "extends" : "forgetful"}
              </span>
              <a
                href={mathlibDocsHref(h.via)}
                target="_blank"
                rel="noopener noreferrer"
                className="lean break-all text-sm text-accent-ink underline underline-offset-4 hover:text-foreground"
              >
                {h.via}
              </a>
              <span className="text-muted-foreground">gives</span>
              <Link href={classHref(h.to)} className="lean text-sm font-medium text-foreground underline underline-offset-4">
                {h.to}
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
