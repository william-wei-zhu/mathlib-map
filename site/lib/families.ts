/** Mirrors FAMILY_LABELS in pipeline/mathlibmap/hierarchy.py. */
export const FAMILY_LABELS: Record<string, string> = {
  Algebra: "Algebra",
  Order: "Order",
  Topology: "Topology",
  Analysis: "Analysis",
  Geometry: "Geometry",
  CategoryTheory: "Category theory",
  Combinatorics: "Combinatorics",
  Logic: "Logic and sets",
  Data: "Data types",
  Core: "Lean core",
  Meta: "Tactics and metaprogramming",
  Other: "Other",
};

/** Families shown as diagram tabs, in order. */
export const DIAGRAM_FAMILIES = ["Algebra", "Order", "Topology", "Analysis", "Geometry", "CategoryTheory", "Combinatorics", "Logic", "Data"] as const;
