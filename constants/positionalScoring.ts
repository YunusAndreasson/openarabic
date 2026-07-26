/**
 * Special component type for bracket injection ([the]).
 *
 * Other component types use the ComponentType enum directly; brackets are
 * system-injected educational markers rather than a detected component, so
 * they need a type of their own.
 */
export const BRACKET_TYPE = 'bracket' as const;
