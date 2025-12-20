/**
 * Sorting utilities for custom order and fallback sorting patterns.
 * Used for reading list and audio playlist custom ordering.
 */

/**
 * Sorts items by custom order array with optional fallback sorting.
 * Items in the custom order come first (in order), followed by remaining items sorted by fallback.
 *
 * @param items - Array of items to sort
 * @param customOrder - Array of IDs representing desired order
 * @param getId - Function to extract ID from an item
 * @param fallbackSort - Optional comparison function for items not in custom order
 * @returns Sorted array (original array is not mutated)
 *
 * @example
 * ```ts
 * const sorted = sortByCustomOrder(
 *   articles,
 *   [3, 1, 5],
 *   item => item.id,
 *   (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
 * );
 * // Returns: articles in order [3, 1, 5, ...others sorted by date]
 * ```
 */
export function sortByCustomOrder<T>(
  items: T[],
  customOrder: number[],
  getId: (item: T) => number,
  fallbackSort?: (a: T, b: T) => number,
): T[] {
  if (!items.length) return [];
  if (!customOrder.length) {
    return fallbackSort ? [...items].sort(fallbackSort) : items;
  }

  // Create position map for O(1) lookup
  const positionMap = new Map(customOrder.map((id, index) => [id, index]));

  return [...items].sort((a, b) => {
    const aId = getId(a);
    const bId = getId(b);

    const aPos = positionMap.get(aId) ?? 999; // Use 999 as sentinel for "not in custom order"
    const bPos = positionMap.get(bId) ?? 999;

    // Both have custom positions
    if (aPos !== 999 && bPos !== 999) {
      return aPos - bPos;
    }

    // Only a has custom position
    if (aPos !== 999) return -1;

    // Only b has custom position
    if (bPos !== 999) return 1;

    // Neither has position - use fallback sort
    return fallbackSort ? fallbackSort(a, b) : 0;
  });
}

/**
 * Default fallback sort function: sort by date descending (newest first).
 * Handles null/undefined dates gracefully.
 *
 * @param dateA - First date string
 * @param dateB - Second date string
 * @returns Comparison result for Array.sort()
 *
 * @example
 * ```ts
 * items.sort((a, b) => sortByDateDesc(a.created_at, b.created_at));
 * ```
 */
export function sortByDateDesc(
  dateA: string | null | undefined,
  dateB: string | null | undefined,
): number {
  if (!dateA && !dateB) return 0;
  if (!dateA) return 1;
  if (!dateB) return -1;
  return new Date(dateB).getTime() - new Date(dateA).getTime();
}
