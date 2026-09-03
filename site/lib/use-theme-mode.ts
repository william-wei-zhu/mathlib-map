"use client";

import { useEffect, useState } from "react";

/**
 * The active color mode read from the actual `.dark` class on <html>, not next-themes' resolvedTheme
 * (which lagged during hydration and left the map drawing the light ramp in dark mode). Starts at
 * "light" to match SSR (no hydration mismatch), then reads the real class on mount and follows it via
 * a MutationObserver when the theme is toggled at runtime.
 */
export function useThemeMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("light");
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setMode(el.classList.contains("dark") ? "dark" : "light");
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return mode;
}
