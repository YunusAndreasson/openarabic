/**
 * Params the category-filter screen is opened with.
 *
 * Built by `getCategoryFilterRoute`, read in two places that used to declare
 * the shape independently — the screen inline in `useLocalSearchParams<...>`,
 * and the layout via an `as FilterParams` cast on `route.params`. One
 * declaration now serves both, so the builder and the readers cannot drift.
 *
 * Both fields are optional because route params are whatever the URL carried:
 * navigating to the screen without them is a runtime possibility, and the
 * layout's title lookup dereferenced them unconditionally. Query-string values
 * are always strings, including `id`, which the screen parses.
 *
 * A `type` rather than an `interface` on purpose: `useLocalSearchParams`
 * constrains its parameter to `Record<string, string | string[]>`, and only an
 * anonymous object type picks up the implicit index signature that satisfies
 * it. Declared as an interface this fails to compile at the screen's call site,
 * which is why the house style is waived here rather than the type split back
 * into two declarations.
 */
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- must stay a type alias; see above
export type FilterParams = {
  /** Category id, as it survives the URL: a string to be parsed. */
  id?: string;
  /** Category display name, already decoded: the router decodes the query string. */
  name?: string;
};
