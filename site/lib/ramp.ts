/**
 * Sequential ramp for magnitude: one hue (the site's terracotta), seven steps, light to dark on
 * the light surface and the anchor flipped on the dark surface (near-zero recedes toward the
 * surface in both). Text on a tile uses the ink or paper token, never the tile color.
 */
export const RAMP = {
  light: ["#f8e6dc", "#f1cbb8", "#e9ad90", "#dd8c66", "#cc6a41", "#b3441c", "#8c3212"],
  dark: ["#2a1a12", "#43261a", "#5f3320", "#7f4327", "#a4552f", "#cf7343", "#f09a6b"],
  neutral: { light: "#ecebe6", dark: "#232321" },
} as const;

/** Steps whose fill is dark enough (light mode) or bright enough (dark mode) to need the other ink. */
const FLIP_FROM = { light: 4, dark: 5 } as const;

export function rampStep(value: number | null): number | null {
  if (value === null || Number.isNaN(value)) return null;
  const v = Math.max(0, Math.min(1, value));
  return Math.min(6, Math.floor(v * 7));
}

export function fillFor(step: number | null, mode: "light" | "dark"): string {
  return step === null ? RAMP.neutral[mode] : RAMP[mode][step];
}

/** Which text token to draw on a tile: "ink" (foreground) or "paper" (background). A bright fill
 *  needs the paper token, a dark fill needs the ink token. In light mode the ramp darkens as the
 *  step rises; in dark mode it brightens, so the two thresholds point opposite ways. */
export function textOn(step: number | null, mode: "light" | "dark"): "ink" | "paper" {
  if (step === null) return "ink";
  if (mode === "light") return step >= FLIP_FROM.light ? "paper" : "ink";
  return step >= FLIP_FROM.dark ? "paper" : "ink";
}
