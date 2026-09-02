import { DATA_BASE_URL } from "@/lib/site";
import type { HierarchyIndex, IndexClass } from "@/lib/data";

/** Index shape written by pipeline/mathlibmap/hierarchy.py (types carry [class, instance] pairs). */
export type TypeEntry = { id: string; direct: [string, string][]; count: number };
export type HierarchyIndexClient = Omit<HierarchyIndex, "types"> & { types: TypeEntry[] };

export type Hop = { from: string; to: string; via: string; kind: "extends" | "forgetful" | "instance" };

export type Graph = {
  index: HierarchyIndexClient;
  byId: Map<string, IndexClass>;
  /** class -> hops to its parents (more general classes) */
  up: Map<string, Hop[]>;
  /** class -> hops from its children (more specific classes) */
  down: Map<string, Hop[]>;
  /** concrete type -> hops to the classes it is directly an instance of */
  typeDirect: Map<string, Hop[]>;
  typeCount: Map<string, number>;
};

let cached: Promise<Graph> | null = null;

/** Load the whole hierarchy index once per page session. */
export function loadGraph(): Promise<Graph> {
  if (!cached) {
    cached = fetch(`${DATA_BASE_URL}/hierarchy/index.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`index ${r.status}`);
        return r.json() as Promise<HierarchyIndexClient>;
      })
      .then(buildGraph)
      .catch((e) => {
        cached = null;
        throw e;
      });
  }
  return cached;
}

export function buildGraph(index: HierarchyIndexClient): Graph {
  const byId = new Map(index.classes.map((c) => [c.id, c]));
  const up = new Map<string, Hop[]>();
  const down = new Map<string, Hop[]>();
  for (const e of index.edges) {
    const hop: Hop = { from: e.from, to: e.to, via: e.via, kind: e.kind };
    (up.get(e.from) ?? up.set(e.from, []).get(e.from)!).push(hop);
    (down.get(e.to) ?? down.set(e.to, []).get(e.to)!).push(hop);
  }
  const typeDirect = new Map<string, Hop[]>();
  const typeCount = new Map<string, number>();
  for (const t of index.types) {
    typeDirect.set(
      t.id,
      t.direct.map(([cls, inst]) => ({ from: t.id, to: cls, via: inst, kind: "instance" as const })),
    );
    typeCount.set(t.id, t.count);
  }
  return { index, byId, up, down, typeDirect, typeCount };
}

function reach(start: Iterable<string>, next: (id: string) => Hop[] | undefined, pick: (h: Hop) => string): Set<string> {
  const seen = new Set<string>();
  const stack = [...start];
  while (stack.length) {
    const x = stack.pop()!;
    for (const h of next(x) ?? []) {
      const y = pick(h);
      if (!seen.has(y)) {
        seen.add(y);
        stack.push(y);
      }
    }
  }
  return seen;
}

/** Every class more general than `id` (transitively). */
export function ancestors(g: Graph, id: string): Set<string> {
  return reach([id], (x) => g.up.get(x), (h) => h.to);
}

/** Every class more specific than `id` (transitively). */
export function descendants(g: Graph, id: string): Set<string> {
  return reach([id], (x) => g.down.get(x), (h) => h.from);
}

/** Every class a concrete type satisfies, or null if the type is not in the index. */
export function typeClosure(g: Graph, type: string): Set<string> | null {
  const direct = g.typeDirect.get(type);
  if (!direct) return null;
  const start = direct.map((h) => h.to);
  const out = reach(start, (x) => g.up.get(x), (h) => h.to);
  for (const s of start) out.add(s);
  return out;
}

/**
 * Shortest chain of instances from `start` (a concrete type or a class) up to `target`.
 * Returns null when there is none, or when `start` is unknown.
 */
export function findPath(g: Graph, start: string, target: string): Hop[] | null {
  const isType = g.typeDirect.has(start);
  if (!isType && !g.byId.has(start)) return null;
  if (!isType && start === target) return [];
  const prev = new Map<string, Hop>();
  const queue: string[] = [];
  const seen = new Set<string>();
  const initial: Hop[] = isType ? (g.typeDirect.get(start) ?? []) : [];
  if (isType) {
    for (const h of initial) {
      if (!seen.has(h.to)) {
        seen.add(h.to);
        prev.set(h.to, h);
        queue.push(h.to);
      }
    }
  } else {
    seen.add(start);
    queue.push(start);
  }
  while (queue.length) {
    const x = queue.shift()!;
    if (x === target) {
      const path: Hop[] = [];
      let cur = x;
      while (prev.has(cur)) {
        const h = prev.get(cur)!;
        path.push(h);
        cur = h.kind === "instance" ? h.from : h.from;
        if (cur === start) break;
      }
      return path.reverse();
    }
    for (const h of g.up.get(x) ?? []) {
      if (!seen.has(h.to)) {
        seen.add(h.to);
        prev.set(h.to, h);
        queue.push(h.to);
      }
    }
  }
  return null;
}

/** Concrete types that satisfy `target`, most broadly-structured first. */
export function typesReaching(g: Graph, target: string, limit = 6): TypeEntry[] {
  const out: TypeEntry[] = [];
  for (const t of g.index.types) {
    const closure = typeClosure(g, t.id);
    if (closure?.has(target)) out.push(t);
    if (out.length >= limit) break;
  }
  return out;
}
