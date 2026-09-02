import type { Metadata } from "next";
import { ComingView } from "@/components/site/coming-view";

export const metadata: Metadata = {
  title: "Structures",
  description: "Mathlib's typeclass hierarchy as one navigable diagram, with a path finder from any type to any class.",
};

export default function HierarchyPage() {
  return (
    <ComingView
      label="Structures"
      title="Mathlib's structures, from Monoid to Field, as one diagram."
      body="Search a class to see what it extends and what extends it. Pick a concrete type such as the real numbers and watch every structure it satisfies light up, with the instance chain that proves it."
      eta="This view ships first. The extractor that reads the hierarchy out of Mathlib is being built now."
    />
  );
}
