/**
 * Typed `{placeholder}` templates.
 *
 * `STRINGS` is `as const`, so each template keeps its literal type, and the
 * placeholders it contains can be read off that type. `fillTemplate` uses them
 * to require exactly the right values: renaming `{count}` in strings.ts without
 * updating a caller is a compile error instead of a literal "{count}" shipped
 * to the screen — which is what ~70 hand-written `.replace('{x}', …)` chains
 * allowed.
 */

/** The `{name}` placeholders in a template string type. */
export type TemplatePlaceholders<S extends string> =
  S extends `${string}{${infer Key}}${infer Rest}` ? Key | TemplatePlaceholders<Rest> : never;

const PLACEHOLDER = /\{(\w+)\}/g;

/**
 * Substitute every `{name}` in `template` with `values[name]`.
 *
 * Every occurrence is replaced (`.replace('{x}', …)` only replaced the first).
 * A `{name}` the caller supplies no value for is left as written — unreachable
 * through the types, but a template built at runtime degrades visibly instead
 * of throwing.
 */
export function fillTemplate<S extends string>(
  template: S,
  values: Readonly<Record<TemplatePlaceholders<S>, string | number>>,
): string {
  const lookup: Readonly<Record<string, string | number>> = values;
  return template.replace(PLACEHOLDER, (match, key: string) =>
    Object.hasOwn(lookup, key) ? String(lookup[key]) : match,
  );
}
