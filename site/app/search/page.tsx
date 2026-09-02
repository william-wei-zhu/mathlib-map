import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { DeclSearch } from "@/components/site/decl-search";

export const metadata: Metadata = {
  title: "Theorems",
  description: "Find any Mathlib declaration and see what it cites, who cites it, and what it rests on down to the axioms.",
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <p className="eyebrow text-accent-ink">Theorems</p>
      <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-foreground sm:text-6xl">
        Find a theorem and see what it rests on.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-foreground">
        Every Mathlib declaration has a page: its statement, the results it cites, the results that cite
        it, and its distance from the axioms, with the plumbing filtered out.
      </p>
      <div className="mt-10">
        <Suspense fallback={<div className="h-12 rounded-full border border-border bg-card" />}>
          <DeclSearch />
        </Suspense>
      </div>
      <section className="mt-16 border-t border-border pt-8">
        <h2 className="font-display text-2xl leading-none text-foreground">Guided descents</h2>
        <p className="mt-3 text-base text-foreground">
          <Link href="/tour/bertrand" className="text-accent-ink underline underline-offset-4 hover:text-foreground">What does Bertrand&apos;s postulate rest on?</Link>{" "}
          Eleven steps from the theorem to the definition of a prime.
        </p>
      </section>
    </div>
  );
}
