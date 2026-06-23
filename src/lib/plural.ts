// Shared (client + server safe) pluralization for "N noun" count labels.

/**
 * Format a count with a grammatically correct noun:
 *   plural(1, "analytic")  -> "1 analytic"
 *   plural(3, "analytic")  -> "3 analytics"
 * Pass an explicit plural form for irregular nouns, e.g. plural(n, "entity", "entities").
 */
export function plural(n: number, singular: string, pluralForm = `${singular}s`): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}
