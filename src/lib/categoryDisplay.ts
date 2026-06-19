import { categoryLabel } from "@/lib/categoryCapacity";

const COMPACT_CATEGORY_LABELS: Record<string, string> = {
  nails: "Nails",
  lash: "Lashes",
  "permanent-makeup": "Perm makeup",
};

const HOME_CATEGORY_LABELS: Record<string, string> = {
  nails: "Nails",
  lash: "Lash Extensions",
  "permanent-makeup": "Permanent Makeup",
  brows: "Brows",
};

/** Short label for booking UI (technician cards, etc.). */
export function compactCategoryLabel(category: string): string {
  return COMPACT_CATEGORY_LABELS[category] ?? categoryLabel(category);
}

/** Full category name for the home page hero (uppercase styling applied in CSS). */
export function homeCategoryLabel(category: string): string {
  if (HOME_CATEGORY_LABELS[category]) return HOME_CATEGORY_LABELS[category];
  return category
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export const DEFAULT_HOME_CATEGORIES = ["nails", "lash", "permanent-makeup", "brows"];
