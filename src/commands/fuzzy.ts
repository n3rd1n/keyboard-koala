export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function fuzzyMatch(pattern: string, target: string): boolean {
  if (!pattern) {
    return true;
  }

  const expression =
    ".*" +
    pattern
      .toLowerCase()
      .split("")
      .map((char) => `${escapeRegExp(char)}.*`)
      .join("");

  return new RegExp(expression).test(target.toLowerCase());
}

/** Higher is better; `null` means the name does not match the query verbatim. */
function exactRank(query: string, name: string): number | null {
  const lowerName = name.toLowerCase();
  if (lowerName === query) {
    return 3;
  }
  if (lowerName.startsWith(query)) {
    return 2;
  }
  if (lowerName.includes(query)) {
    return 1;
  }
  return null;
}

/**
 * Two-stage search: names containing the query verbatim come first (exact hit
 * before prefix before substring), only then the remaining fuzzy matches.
 * Within a stage the original order is kept.
 */
export function filterByFuzzyName<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return items.slice();
  }

  const exact: { item: T; rank: number; index: number }[] = [];
  const fuzzy: T[] = [];

  items.forEach((item, index) => {
    const rank = exactRank(normalized, item.name);
    if (rank !== null) {
      exact.push({ item, rank, index });
      return;
    }
    if (fuzzyMatch(normalized, item.name)) {
      fuzzy.push(item);
    }
  });

  exact.sort((a, b) => b.rank - a.rank || a.index - b.index);

  return [...exact.map((entry) => entry.item), ...fuzzy];
}
