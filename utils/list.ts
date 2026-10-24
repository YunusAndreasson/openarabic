/**
 * Shuffles an array using the Fisher-Yates algorithm
 * @param items - The array to shuffle
 * @param random - Source of uniform [0, 1) numbers; inject a seeded one for a
 *   reproducible order (see {@link seededRandom})
 * @returns A new shuffled array (original array is not modified)
 */
export function shuffleArray<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    // Both indices are in bounds by construction, so neither read is undefined.
    [shuffled[i], shuffled[j]] = [shuffled[j] as T, shuffled[i] as T];
  }
  return shuffled;
}

/**
 * mulberry32: a small, fast, seeded uniform [0, 1) generator. The same seed
 * always yields the same sequence, so a shuffle driven by it is reproducible.
 */
export function seededRandom(seed: number): () => number {
  let t = seed;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Whether `value` is one of `list`'s members — narrowing it to their union.
 *
 * The typed form of `list.includes(value)`, which does not compile against an
 * `as const` tuple without first widening the tuple (or narrowing the value)
 * by cast.
 */
export function isOneOf<const T extends readonly string[]>(
  list: T,
  value: string,
): value is T[number] {
  return list.some(member => member === value);
}

/** One labelled bucket of a breakdown, with how many items fell in it. */
export interface Band<K extends string> {
  key: K;
  label: string;
  count: number;
}

/** The group of the items `tallyBands`' `bandOf` places in no band. */
const UNBANDED = Symbol('unbanded');

/**
 * Counts `items` into the bands `keys` names, in `keys` order: every band is
 * present, an empty one at zero. An item `bandOf` places in no band (`null`)
 * is not counted.
 */
export function tallyBands<T, K extends string>(
  items: readonly T[],
  keys: readonly K[],
  labels: Readonly<Record<K, string>>,
  bandOf: (item: T) => K | null,
): Band<K>[] {
  const groups = Object.groupBy(items, item => bandOf(item) ?? UNBANDED);
  return keys.map(key => ({ key, label: labels[key], count: groups[key]?.length ?? 0 }));
}
