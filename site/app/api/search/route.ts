import { fetchShard, type HierarchyIndex } from "@/lib/data";
import { filterSearchEntries, searchShardKey, type SearchEntry } from "@/lib/atlas-data";

export type StructureHit = { id: string; family: string; assumedBy: number };
export type SearchResponse = { theorems: SearchEntry[]; structures: StructureHit[] };

// Cache the class list in the server process: it is small enough and used by every structure query.
let classCache: HierarchyIndex["classes"] | null = null;
async function classes(): Promise<HierarchyIndex["classes"]> {
  if (!classCache) {
    const idx = await fetchShard<HierarchyIndex>("hierarchy/index.json");
    classCache = idx?.classes ?? [];
  }
  return classCache;
}

/**
 * Server-side search for declarations and type classes. The multi-megabyte prefix shard and the
 * 1.3MB hierarchy index are fetched and filtered here (held in Next's data cache, shared across
 * requests), so the client only ever receives the top matches instead of downloading them per
 * keystroke.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const q = params.get("q")?.trim() ?? "";
  const limit = Math.min(60, Math.max(1, Number(params.get("limit")) || 40));
  if (q.length < 2) return Response.json({ theorems: [], structures: [] } satisfies SearchResponse);

  const key = searchShardKey(q);
  const l = q.toLowerCase();
  try {
    const [shard, cls] = await Promise.all([
      key ? fetchShard<SearchEntry[]>(`atlas/search/${key}.json`) : Promise.resolve(null),
      classes(),
    ]);
    const theorems = shard ? filterSearchEntries(shard, q, limit) : [];
    const structures = cls
      .filter((c) => !c.hidden && c.id.toLowerCase().includes(l))
      .sort((a, b) => b.assumedBy - a.assumedBy)
      .slice(0, 6)
      .map((c) => ({ id: c.id, family: c.family, assumedBy: c.assumedBy }));
    return Response.json({ theorems, structures } satisfies SearchResponse);
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503 });
  }
}
