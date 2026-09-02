"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const KEY = "atlas.legendDismissed";

/**
 * A one-line explanation of what the map encodes, shown on first visit to the world view. Dismissed
 * permanently per-browser. The same grammar also lives in the Layers popover, so this is the
 * discoverable primer, not the only place it exists.
 */
export function MapLegend() {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid a flash before we read storage

  useEffect(() => {
    try { setDismissed(localStorage.getItem(KEY) === "1"); } catch { setDismissed(false); }
  }, []);

  if (dismissed) return null;

  return (
    <div className="pointer-events-auto absolute bottom-5 left-1/2 z-30 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-3 rounded-full border border-border bg-card/95 px-4 py-2 shadow-md backdrop-blur max-sm:hidden">
      <p className="text-xs leading-snug text-muted-foreground">
        <span className="text-foreground">Size</span> = declarations ·{" "}
        <span className="text-foreground">height</span> = distance from the axioms ·{" "}
        <span className="text-foreground">color</span> = coverage ·{" "}
        <span className="text-foreground">nearby</span> areas share theorems
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => { try { localStorage.setItem(KEY, "1"); } catch {} setDismissed(true); }}
        className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
