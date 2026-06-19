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

const HOME_MOBILE_CATEGORY_LABELS: Record<string, string> = {
  nails: "Nails",
  lash: "Lash Ext",
  brows: "Brows",
  "permanent-makeup": "Permanent Makeup",
};

/** Preferred display order on the home page hero. */
export const HOME_CATEGORY_ORDER = ["nails", "lash", "brows", "permanent-makeup"];

/** First row on mobile: nails, lash, brows — permanent makeup on the line below. */
export const HOME_MOBILE_FIRST_ROW = ["nails", "lash", "brows"];

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

/** Shorter labels for the mobile hero layout. */
export function homeCategoryMobileLabel(category: string): string {
  if (HOME_MOBILE_CATEGORY_LABELS[category]) return HOME_MOBILE_CATEGORY_LABELS[category];
  return homeCategoryLabel(category);
}

export function sortHomeCategories(categories: string[]): string[] {
  return [...categories].sort((a, b) => {
    const aIndex = HOME_CATEGORY_ORDER.indexOf(a);
    const bIndex = HOME_CATEGORY_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
}

export function partitionHomeCategoriesForMobile(categories: string[]) {
  const ordered = sortHomeCategories(categories);
  const firstRow = HOME_MOBILE_FIRST_ROW.filter((category) => ordered.includes(category));
  const secondRow = ordered.filter((category) => !HOME_MOBILE_FIRST_ROW.includes(category));
  return { firstRow, secondRow };
}

export const DEFAULT_HOME_CATEGORIES = ["nails", "lash", "brows", "permanent-makeup"];
