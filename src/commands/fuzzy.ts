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

export function filterByFuzzyName<T extends { name: string }>(
  items: T[],
  query: string,
): T[] {
  return items.filter((item) => fuzzyMatch(query, item.name));
}
