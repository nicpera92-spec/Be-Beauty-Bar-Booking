import { categoryLabel } from "@/lib/categoryCapacity";

const COMPACT_CATEGORY_LABELS: Record<string, string> = {
  nails: "Nails",
  lash: "Lashes",
  "permanent-makeup": "Perm makeup",
};

/** Short label for booking UI (technician cards, etc.). */
export function compactCategoryLabel(category: string): string {
  return COMPACT_CATEGORY_LABELS[category] ?? categoryLabel(category);
}

/** Full category name for the home page hero (uppercase styling applied in CSS). */
export function homeCategoryLabel(category: string): string {
  return categoryLabel(category);
}
