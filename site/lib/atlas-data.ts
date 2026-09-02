/**
 * SHA-1 of a UTF-8 string, hex. Small and dependency-free so this module stays pure and ships no
 * node:crypto polyfill into the client bundle (it is imported by several "use client" components).
 * Matches Python's hashlib.sha1(name.encode()).hexdigest().
 */
function sha1Hex(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const rotl = (n: number, s: number) => ((n << s) | (n >>> (32 - s))) >>> 0;
  const ml = bytes.length * 8;
  const total = (bytes.length + 8 + 64) & ~63; // room for 0x80 + 64-bit length, padded to 64 bytes
  const msg = new Uint8Array(total);
  msg.set(bytes);
  msg[bytes.length] = 0x80;
  const dv = new DataView(msg.buffer);
  dv.setUint32(total - 8, Math.floor(ml / 0x100000000));
  dv.setUint32(total - 4, ml >>> 0);
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  for (let off = 0; off < total; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const t = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d; d = c; c = rotl(b, 30); b = a; a = t;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
  }
  const hex = (n: number) => (n >>> 0).toString(16).padStart(8, "0");
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4);
}

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

/** Split a query into lowercased tokens the way the search index splits names (whitespace/dot/_). */
export function searchTokens(q: string): string[] {
  return q.toLowerCase().split(/[\s._]+/).filter(Boolean);
}

/** The prefix shard a query maps to: first two chars of its last token, or null if too short. */
export function searchShardKey(q: string): string | null {
  const tokens = searchTokens(q);
  const last = tokens[tokens.length - 1];
  if (!last || last.length < 2) return null;
  const k = last.slice(0, 2);
  return /^[a-z0-9]{2}$/.test(k) ? k : null;
}

/** Filter a prefix shard to the entries matching every query token, most cited first. */
export function filterSearchEntries(entries: SearchEntry[], q: string, limit: number): SearchEntry[] {
  const tokens = searchTokens(q);
  return entries
    .filter(([name]) => { const l = name.toLowerCase(); return tokens.every((t) => l.includes(t)); })
    .sort((a, b) => b[2] - a[2])
    .slice(0, limit);
}

/** Percent-encode exactly like Python's urllib.parse.quote(name, safe=""). */
export function pyQuote(s: string): string {
  return encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

export function declHref(name: string): string {
  return `/decl/${encodeURIComponent(name)}`;
}

/** Bucket path of a node shard: the atlas prefix, two hex chars of sha1, then the encoded name. */
export function nodeShardPath(name: string): string {
  const prefix = sha1Hex(name).slice(0, 2);
  return `atlas/nodes/${prefix}/${pyQuote(name)}.json`;
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
