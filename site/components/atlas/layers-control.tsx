"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Layers } from "lucide-react";
import { RAMP } from "@/lib/ramp";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";
import type { Metric } from "./atlas-canvas";

export function LayersControl({ metric, onMetric }: { metric: Metric; onMetric: (m: Metric) => void }) {
  const { resolvedTheme } = useTheme();
  const mode: "light" | "dark" = resolvedTheme === "dark" ? "dark" : "light";
  const pathname = usePathname();
  const structures = pathname.startsWith("/hierarchy") || pathname.startsWith("/class");

  const tab = (active: boolean) =>
    cn("eyebrow flex-1 rounded-full px-3 py-1.5 text-center transition-colors", active ? "bg-foreground text-background" : "text-foreground hover:bg-muted");
  const chip = (active: boolean) =>
    cn("eyebrow rounded-full border px-2.5 py-1 transition-colors", active ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:border-foreground");

  return (
    <div className="w-60 rounded-2xl border border-border bg-card p-3 shadow-md">
      <div className="mb-2 flex items-center gap-2">
        <Layers className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="eyebrow text-muted-foreground">Layers</span>
      </div>
      <div className="flex rounded-full bg-muted p-1">
        <Link href="/" className={tab(!structures)}>Areas</Link>
        <Link href="/hierarchy" className={tab(structures)}>Structures</Link>
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
        </>
      )}
    </div>
  );
}
