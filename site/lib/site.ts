export const SITE_NAME = "Mathlib Map";
export const SITE_TAGLINE = "Every theorem in Mathlib, on the map.";
export const SITE_TITLE = `${SITE_NAME}: ${SITE_TAGLINE}`;
export const SITE_URL = "https://mathlibmap.com";
export const SITE_DESCRIPTION =
  "A map of Lean's Mathlib: which areas of mathematics are formalized, how its structures fit together, and what every theorem rests on.";

export const GITHUB_OWNER = "william-wei-zhu";
export const GITHUB_REPO_NAME = "mathlib-map";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO_NAME}`;
export const LINKEDIN_URL = "https://www.linkedin.com/in/william-wei-zhu/";

export const INDEPENDENCE_LINE =
  "An independent project, not affiliated with the Mathlib community or the Lean FRO.";

/** Public bucket that holds the precomputed data shards. */
export const DATA_BASE_URL =
  process.env.NEXT_PUBLIC_DATA_BASE_URL ?? "https://storage.googleapis.com/mathlibmap-data";
