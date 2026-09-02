import { createHash } from "node:crypto";

/** Shapes written by pipeline/mathlibmap/atlas.py. Keep in sync by hand. */
export type Neighbor = { name: string; kind: string; via: "statement" | "proof" | "both"; citedBy: number };

export type NodePage = {
  name: string;
  kind: string;
  module: string | null;
  area: { code: string; short: string } | null;
  statement: string;
  doc: string | null;
  assumes: string[];
  deprecated: { to: string | null; since: string | null } | null;
  famous: string[];
  citedBy: number;
  rank: number;
  depth: number;
  axioms: string[];
  restsOnDefinitions: number | null;
  usesCount: number;
  usedByCount: number;
  uses: Neighbor[];
  usedBy: Neighbor[];
  star: string[];
};

export type SearchEntry = [name: string, kind: string, citedBy: number];

/** Percent-encode exactly like Python's urllib.parse.quote(name, safe=""). */
export function pyQuote(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export function declHref(name: string): string {
  return `/decl/${encodeURIComponent(name)}`;
}

/** Bucket path of a node shard: two hex chars of sha1, then the encoded name. */
export function nodeShardPath(name: string): string {
  const prefix = createHash("sha1").update(name).digest("hex").slice(0, 2);
  return `nodes/${prefix}/${pyQuote(name)}.json`;
}

export function loogleHref(query: string): string {
  return `https://loogle.lean-lang.org/?q=${encodeURIComponent(query)}`;
}

export function leanSearchHref(query: string): string {
  return `https://leansearch.net/?q=${encodeURIComponent(query)}`;
}

export function sourceHref(module: string, tag: string): string {
  return `https://github.com/leanprover-community/mathlib4/blob/${tag}/${module.replace(/\./g, "/")}.lean`;
}

export const KIND_LABEL: Record<string, string> = {
  theorem: "Theorem",
  definition: "Definition",
  inductive: "Inductive type",
  axiom: "Axiom",
  opaque: "Opaque definition",
};
