"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Layers } from "lucide-react";
import { RAMP } from "@/lib/ramp";
import { cn } from "@/lib/utils";
import { useDismiss } from "@/lib/use-dismiss";
import { track } from "@/lib/analytics";
import type { Metric } from "./atlas-canvas";

/** A small collapsible layers control, like Google Maps: an icon button that opens a popover. */
export function LayersControl({ metric, onMetric }: { metric: Metric; onMetric: (m: Metric) => void }) {
  const { resolvedTheme } = useTheme();
  const mode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";
  const pathname = usePathname();
  const structures = pathname.startsWith("/hierarchy") || pathname.startsWith("/class");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, () => setOpen(false));

  const tab = (active: boolean) =>
    cn("eyebrow flex-1 rounded-full px-3 py-1.5 text-center transition-colors", active ? "bg-foreground text-background" : "text-foreground hover:bg-muted");
  const chip = (active: boolean) =>
    cn("eyebrow rounded-full border px-2.5 py-1 transition-colors", active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground");

  return (
    <div ref={ref} className="relative">
      {open && (
        <div className="absolute bottom-full right-0 mb-2 w-60 rounded-2xl border border-border bg-card p-3 shadow-xl">
          <div className="mb-2 flex items-center gap-2">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="eyebrow text-muted-foreground">Layers</span>
          </div>
          <div className="flex rounded-full bg-muted p-1">
            <Link href="/" className={tab(!structures)} onClick={() => setOpen(false)}>Areas</Link>
            <Link href="/hierarchy" className={tab(structures)} onClick={() => setOpen(false)}>Structures</Link>
          </div>
          {!structures && (
            <>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button type="button" className={chip(metric === "coverage")} onClick={() => { onMetric("coverage"); track("layer_toggled", { metric: "coverage" }); }}>Coverage</button>
                <button type="button" className={chip(metric === "conjectures")} onClick={() => { onMetric("conjectures"); track("layer_toggled", { metric: "conjectures" }); }}>Conjectures</button>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="eyebrow text-muted-foreground">{metric === "coverage" ? "0%" : "few"}</span>
                <div className="flex overflow-hidden rounded-sm border border-border">
                  {RAMP[mode].map((c) => <span key={c} className="h-3 w-4" style={{ background: c }} />)}
                </div>
                <span className="eyebrow text-muted-foreground">{metric === "coverage" ? "100%" : "many"}</span>
              </div>
              <p className="mt-2 text-xs leading-snug text-muted-foreground">
                {metric === "coverage" ? "Shaded by share of famous theorems formalized." : "Shaded by open conjectures stated in Lean."}
              </p>
              <div className="mt-3 border-t border-border pt-2">
                <p className="text-xs leading-snug text-muted-foreground">
                  Blob <span className="text-foreground">size</span> = declarations ·{" "}
                  <span className="text-foreground">height</span> = distance from the axioms ·{" "}
                  <span className="text-foreground">nearby</span> areas share theorems.
                </p>
              </div>
            </>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Layers"
        aria-expanded={open}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full border bg-card shadow-md transition-colors",
          open ? "border-foreground text-foreground" : "border-border text-foreground hover:border-foreground",
        )}
      >
        <Layers className="h-5 w-5" />
      </button>
    </div>
  );
}
