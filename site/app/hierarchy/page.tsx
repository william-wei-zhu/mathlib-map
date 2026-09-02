import type { Metadata } from "next";
import { Suspense } from "react";
import { HierarchyExplorer } from "@/components/site/hierarchy-explorer";

export const metadata: Metadata = {
  title: "Structures",
  description: "Mathlib's typeclass hierarchy as one navigable diagram: what extends what, and which concrete types satisfy which classes.",
};

export default function HierarchyPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <p className="eyebrow text-accent-ink">Structures</p>
      <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight tracking-tight text-foreground sm:text-6xl">
        Mathlib&apos;s structures, from <span className="lean text-[0.85em]">Mul</span> to <span className="lean text-[0.85em]">Field</span>, in one diagram.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-foreground">
        Pick a family, focus on a class to see everything above and below it, or light up a concrete
        type to see every structure it satisfies. Click any class for its page.
      </p>
      <div className="mt-10">
        <Suspense fallback={<div className="h-64 rounded-lg border border-border bg-card" />}>
          <HierarchyExplorer />
        </Suspense>
      </div>
    </div>
  );
}
