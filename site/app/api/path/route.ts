import { fetchShard } from "@/lib/data";
import { nodeShardPath, type NodePage, type Neighbor } from "@/lib/atlas-data";

// Bounded so one request cannot walk the whole 3M-edge graph: at most this many shards are fetched,
// paths at most this deep, and each node contributes at most this many (proof-preferred) neighbors.
const MAX_FETCH = 300;
const MAX_DEPTH = 14;
const BRANCH = 24;

type Dir = "uses" | "usedBy";
const other = (s: "F" | "B"): "F" | "B" => (s === "F" ? "B" : "F");
const rankVia = (n: Neighbor) => (n.via === "statement" ? 1 : 0); // proof/both first

/**
 * "How does theorem A rest on B?" A bounded bidirectional breadth-first search over the dependency
 * graph: forward from A along what it uses, backward from B along what uses it, meeting in the
 * middle. Proof (and statement+proof) edges are preferred so the chain is a real proof-support path.
 * Shards are read server-side (Next data cache), so the client only receives the resulting chain.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const from = params.get("from")?.trim();
  const to = params.get("to")?.trim();
  if (!from || !to) return Response.json({ error: "from and to are required" }, { status: 400 });
  if (from === to) return Response.json({ path: [from] });

  const cache = new Map<string, NodePage | null>();
  let fetches = 0;
  async function node(name: string): Promise<NodePage | null> {
    const hit = cache.get(name);
    if (hit !== undefined) return hit;
    if (fetches >= MAX_FETCH) return null;
    fetches++;
    let p: NodePage | null = null;
    try { p = await fetchShard<NodePage>(nodeShardPath(name)); } catch { p = null; }
    cache.set(name, p);
    return p;
  }
  const neighbors = (p: NodePage, dir: Dir): Neighbor[] =>
    [...((dir === "uses" ? p.uses : p.usedBy) ?? [])].sort((a, b) => rankVia(a) - rankVia(b) || b.citedBy - a.citedBy).slice(0, BRANCH);

  const parent = { F: new Map<string, string>(), B: new Map<string, string>() };
  const vis = { F: new Set<string>([from]), B: new Set<string>([to]) };
  const front: { F: string[]; B: string[] } = { F: [from], B: [to] };
  let meet: string | null = null;

  try {
    for (let depth = 0; depth < MAX_DEPTH && !meet && fetches < MAX_FETCH; depth++) {
      const side: "F" | "B" = front.F.length <= front.B.length ? "F" : "B";
      const dir: Dir = side === "F" ? "uses" : "usedBy";
      const next: string[] = [];
      for (const name of front[side]) {
        if (fetches >= MAX_FETCH) break;
        const p = await node(name);
        if (!p) continue;
        for (const nb of neighbors(p, dir)) {
          const m = nb.name;
          if (vis[side].has(m)) continue;
          vis[side].add(m);
          parent[side].set(m, name);
          if (vis[other(side)].has(m)) { meet = m; break; }
          next.push(m);
        }
        if (meet) break;
      }
      if (!meet) {
        front[side] = next;
        if (next.length === 0) break;
      }
    }
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }

  if (!meet) return Response.json({ path: null, truncated: fetches >= MAX_FETCH });

  const left: string[] = [];
  for (let c: string | undefined = meet; c !== undefined; c = parent.F.get(c)) left.push(c);
  left.reverse(); // from ... meet
  const right: string[] = [];
  for (let r = parent.B.get(meet); r !== undefined; r = parent.B.get(r)) right.push(r);
  return Response.json({ path: [...left, ...right] }); // from ... meet ... to
}
