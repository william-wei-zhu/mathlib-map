import { DATA_BASE_URL } from "@/lib/site";

/** Shapes written by pipeline/mathlibmap/hierarchy.py. Keep in sync by hand. */
export type ParentRef = { name: string; projFn: string; subobject: boolean };

export type ClassPage = {
  id: string;
  family: string;
  module: string | null;
  doc: string | null;
  arity: number;
  isStructure: boolean;
  ownFields: string[];
  parents: ParentRef[];
  ancestors: string[];
  children: string[];
  forgetfulOut: string[];
  forgetfulIn: string[];
  derivedInstances: { name: string; sources: string[] }[];
  concreteTypes: { type: string; instances: string[] }[];
  assumedBy: { count: number; sample: string[] };
};

export type IndexClass = {
  id: string;
  family: string;
  module: string | null;
  arity: number;
  doc: string | null;
  extends: string[];
  instances: number;
  assumedBy: number;
  hidden: boolean;
};

export type IndexEdge = { from: string; to: string; kind: "extends" | "forgetful"; via: string };

export type HierarchyIndex = {
  snapshot: { mathlibTag?: string; date?: string };
  classes: IndexClass[];
  edges: IndexEdge[];
  types: { id: string; direct: string[]; all: string[]; count: number }[];
  families: { id: string; label: string; classes: number }[];
};

export class DataUnavailableError extends Error {}

/** Fetch one JSON shard from the bucket. Returns null on 404, throws on other failures. */
export async function fetchShard<T>(path: string, revalidate = 600): Promise<T | null> {
  const url = `${DATA_BASE_URL}/${path}`;
  const res = await fetch(url, { next: { revalidate } });
  // The bucket is public-read, so a 403 can only mean the object does not exist
  // (GCS answers 403 rather than 404 for missing objects when listing is not granted).
  if (res.status === 404 || res.status === 403) return null;
  if (!res.ok) throw new DataUnavailableError(`${res.status} for ${path}`);
  return (await res.json()) as T;
}

/** Class names are Lean identifiers: dots, unicode, primes. One segment each way. */
export function classHref(name: string): string {
  return `/class/${encodeURIComponent(name)}`;
}

export function mathlibDocsHref(declName: string): string {
  return `https://leanprover-community.github.io/mathlib4_docs/find/#doc/${encodeURIComponent(declName)}`;
}

export function moduleDocsHref(module: string): string {
  return `https://leanprover-community.github.io/mathlib4_docs/${module.replace(/\./g, "/")}.html`;
}
