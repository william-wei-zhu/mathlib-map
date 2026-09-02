import type { Metadata } from "next";
import { ComingView } from "@/components/site/coming-view";

export const metadata: Metadata = {
  title: "Theorems",
  description: "Find any Mathlib declaration and see what it cites, who cites it, and what it rests on down to the axioms.",
};

export default function SearchPage() {
  return (
    <ComingView
      label="Theorems"
      title="Find a theorem and see what it rests on."
      body="Every declaration gets a page: its statement, the results it cites, the results that cite it, and the path down to the axioms, with the elaborator plumbing filtered out so only the mathematics shows."
      eta="This view lands after Structures and the Map."
    />
  );
}
