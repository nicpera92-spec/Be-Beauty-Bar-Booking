// Default category ranking used when a technician hasn't set a custom order.
const DEFAULT_CATEGORY_ORDER = ["nails", "lash", "permanent-makeup"];

function defaultRank(category: string): number {
  const i = DEFAULT_CATEGORY_ORDER.indexOf(category);
  return i === -1 ? DEFAULT_CATEGORY_ORDER.length : i;
}

/** Parse a stored categoryOrder JSON string into a string array (safe). */
export function parseCategoryOrder(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((c) => typeof c === "string");
  } catch {
    // ignore malformed values
  }
  return [];
}

/**
 * Order the given category slugs using a technician's saved order first, then
 * any remaining categories by the default rank (nails → lash → PMU) and A–Z.
 */
export function orderCategories(
  categories: string[],
  savedOrder: string[] | string | null | undefined
): string[] {
  const saved = Array.isArray(savedOrder) ? savedOrder : parseCategoryOrder(savedOrder);
  const present = new Set(categories);
  const result: string[] = [];

  for (const cat of saved) {
    if (present.has(cat) && !result.includes(cat)) result.push(cat);
  }

  const remaining = categories
    .filter((c) => !result.includes(c))
    .sort((a, b) => {
      const rankDiff = defaultRank(a) - defaultRank(b);
      return rankDiff !== 0 ? rankDiff : a.localeCompare(b);
    });

  return [...result, ...remaining];
}
