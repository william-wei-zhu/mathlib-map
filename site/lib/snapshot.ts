import { fetchShard } from "@/lib/data";

/**
 * Which Mathlib the site currently describes. The pipeline writes meta.json to the bucket root on
 * every run; this constant is the fallback when that file cannot be read.
 */
export const SNAPSHOT = {
  mathlibTag: "v4.33.0",
  date: "2026-09-02",
} as const;

export type Meta = {
  snapshot: { mathlibTag: string; date: string };
  counts: { constants: number; spineNodes: number; spineEdges: number };
  downloads: string;
};

export async function getSnapshot(): Promise<{ mathlibTag: string; date: string; downloads: string | null }> {
  try {
    const meta = await fetchShard<Meta>("meta.json");
    if (meta?.snapshot?.mathlibTag) return { ...meta.snapshot, downloads: meta.downloads ?? null };
  } catch {
    // fall through to the constant
  }
  return { ...SNAPSHOT, downloads: null };
}
