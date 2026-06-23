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
  lash: "Lash Extension",
  brows: "Brows",
  "permanent-makeup": "Permanent Makeup",
};

/** Preferred display order on the home page hero. */
export const HOME_CATEGORY_ORDER = ["nails", "lash", "brows", "permanent-makeup"];

/** Mobile hero: row 1 = nails + lash; brows and permanent makeup each on their own line below. */
export const HOME_MOBILE_CATEGORY_ROWS = [
  ["nails", "lash"],
  ["brows"],
  ["permanent-makeup"],
] as const;

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

export function mobileHomeCategoryRows(categories: string[]): string[][] {
  const ordered = new Set(sortHomeCategories(categories));
  const rows: string[][] = HOME_MOBILE_CATEGORY_ROWS.map((row) =>
    row.filter((category) => ordered.has(category))
  ).filter((row) => row.length > 0);

  const inLayout = new Set<string>(HOME_MOBILE_CATEGORY_ROWS.flat());
  const extras = sortHomeCategories(categories).filter((category) => !inLayout.has(category));
  if (extras.length > 0) {
    rows.push(extras);
  }

  return rows;
}

export const DEFAULT_HOME_CATEGORIES = ["nails", "lash", "brows", "permanent-makeup"];
