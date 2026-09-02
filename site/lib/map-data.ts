/** Shapes written by pipeline/mathlibmap/mapview.py. Keep in sync by hand. */

export type SubareaSummary = { code: string; label: string; declarations: number; modules: number };

export type AreaSummary = {
  code: string;
  label: string;
  /** Curated short name for tiles, tables, and prose; `label` is the official MSC heading. */
  short?: string;
  declarations: number;
  theorems: number;
  definitions: number;
  modules: number;
  famous_total: number;
  famous_mathlib: number;
  famous_lean: number;
  conjectures_open: number;
  conjectures_solved: number;
  undergrad_total: number;
  undergrad_missing: number;
  hundred: number;
  subareas: SubareaSummary[];
  /** Spatial-embedding position [x, y] in the 1200x760 World-map viewBox, from embed.py.
   *  Absent for areas the embedding could not place; the World map falls back to a size grid. */
  pos?: [number, number];
};

export type MapIndex = {
  snapshot: { mathlibTag?: string; date?: string };
  totals: {
    declarations: number;
    theorems: number;
    definitions: number;
    modules: number;
    areas_total: number;
    areas_covered: number;
    famous_total: number;
    famous_mathlib: number;
    famous_lean: number;
    conjectures_open: number;
    conjectures_solved: number;
    undergrad_total: number;
    undergrad_missing: number;
    classification_agreement: { agree: number; total: number };
  };
  headline: { deepest: string[]; widestGap: string | null };
  areas: AreaSummary[];
};

export type AreaPage = Omit<AreaSummary, "subareas"> & {
  subareas: (SubareaSummary & { theorems: number })[];
  files: { module: string; primary: string; title: string; theorems: number; definitions: number; declarations: number; confidence: number; source: string }[];
  famous: { wikidata: string; title: string; msc: string; mathlib: boolean; lean: boolean; decls: string[]; url: string }[];
  hundred: { number: number; title: string; decl: string; module: string }[];
  conjectures: { name: string; category: "open" | "solved"; collection: string | null; url: string | null }[];
  undergrad: { chapter: string; total: number; missing: number; missingTopics: string[] }[];
  classes: { id: string; assumedBy: number; instances: number }[];
  /** Most cited results in this area, from the Theorems build; absent until it has run. */
  topResults?: { name: string; citedBy: number }[];
};

/** Short name with a fallback for data written before the field existed. */
export function shortName(a: { short?: string; label: string }): string {
  return a.short ?? a.label.split(";")[0].split(",")[0].toLowerCase();
}

export function areaHref(code: string): string {
  return `/area/${code}`;
}

/** Famous-theorem coverage as a ratio, or null when the area has no entries in the 1000+ list. */
export function coverage(a: { famous_total: number; famous_mathlib: number }): number | null {
  return a.famous_total > 0 ? a.famous_mathlib / a.famous_total : null;
}

export function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export function fmt(n: number): string {
  return n.toLocaleString("en-US");
}
