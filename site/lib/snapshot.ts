/**
 * Which Mathlib the site currently describes. The pipeline writes graph/meta.json to the
 * bucket on every run; until the first run this constant is the source of truth.
 */
export const SNAPSHOT = {
  mathlibTag: "v4.33.0",
  date: "2026-09",
} as const;
