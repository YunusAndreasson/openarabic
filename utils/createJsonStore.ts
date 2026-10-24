import AsyncStorage from '@react-native-async-storage/async-storage';

import { handleError, type ErrorOptions } from '@/utils/errorHandling';

/**
 * A typed value kept as JSON under one AsyncStorage key.
 *
 * Five modules hand-wrote the same read and write — getItem, JSON.parse, a
 * shape check (or an `as Partial<…>` merge that trusted every field), a
 * fail-safe value, a JSON.stringify, and a try/catch around each — and each
 * one's details drifted: which failures were reported, what a corrupt blob
 * read as, whether a module cache survived the key being deleted (the
 * notification prompt's did, across an account switch). This is that shape
 * once, with the per-store decisions passed in.
 *
 * Nothing about what is STORED changes: the keys are the ones devices already
 * hold, and `encode` reproduces exactly what each store wrote before.
 */

/** How a failed read or write is reported; `false` for a best-effort store that stays silent. */
export type JsonStoreReporting = false | { read: ErrorOptions; write: ErrorOptions };

export interface JsonStoreOptions<T> {
  /** The AsyncStorage key, or a function read at each call. */
  key: string | (() => string);
  /**
   * The parsed JSON narrowed back onto `T`, or `null` when it is not a value
   * this store recognises — which reads as `empty()`, like a missing key.
   */
  decode: (raw: unknown) => T | null;
  /** What a missing (or empty) key reads as. */
  empty: () => T;
  /**
   * What a failed read reads as: storage threw, or the JSON did not parse.
   * The store never writes it back, so a transient failure is retried by the
   * next read that is not served from the cache.
   */
  onReadError: () => T;
  /** What is stored for a value; the value itself when omitted. */
  encode?: (value: T) => unknown;
  /** Defaults to reporting both failures without a toast. */
  report?: JsonStoreReporting;
  /**
   * Keep the last value read or written in memory and serve reads from it.
   * `reset()` forgets it — call that whenever something else removes the key.
   */
  cache?: boolean;
}

export interface JsonStore<T> {
  /** Never rejects: a missing key reads `empty()`, a failed read `onReadError()`. */
  read(): Promise<T>;
  /** Never rejects: a failed write is reported (or not) per `report`. */
  write(value: T): Promise<void>;
  /** Forget the cached value, so the next read goes to storage. A no-op without `cache`. */
  reset(): void;
}

const QUIET_REPORTING: JsonStoreReporting = {
  read: { showToast: false },
  write: { showToast: false },
};

export function createJsonStore<T>({
  key,
  decode,
  empty,
  onReadError,
  encode = value => value,
  report = QUIET_REPORTING,
  cache = false,
}: JsonStoreOptions<T>): JsonStore<T> {
  const resolveKey = typeof key === 'function' ? key : () => key;
  let cached: { value: T } | null = null;
  // Bumped by every write and reset, so a read that started before either
  // cannot put an older value back into the cache when it lands.
  let generation = 0;

  const readFromStorage = async (): Promise<T> => {
    try {
      const raw = await AsyncStorage.getItem(resolveKey());
      if (!raw) return empty();
      return decode(JSON.parse(raw)) ?? empty();
    } catch (error) {
      if (report) void handleError(error, report.read);
      return onReadError();
    }
  };

  return {
    async read() {
      if (cached) return cached.value;
      const startedAt = generation;
      const value = await readFromStorage();
      if (cache && startedAt === generation) cached = { value };
      return value;
    },

    async write(value) {
      generation += 1;
      if (cache) cached = { value };
      try {
        await AsyncStorage.setItem(resolveKey(), JSON.stringify(encode(value)));
      } catch (error) {
        if (report) void handleError(error, report.write);
      }
    },

    reset() {
      generation += 1;
      cached = null;
    },
  };
}

/** The JS types a stored field can be checked against. */
export type StoredFieldKind = 'boolean' | 'number' | 'string';

/**
 * Decode a stored object field by field onto `defaults`: a field the schema
 * names, holding the type it declares, replaces the default; anything else is
 * ignored. A non-object reads as `null` (unrecognised).
 *
 * This replaces `{ ...defaults, ...(parsed as Partial<T>) }`, which trusted
 * every stored field's type. Fields are visited in their stored order, the
 * order that spread produced, so a blob this app wrote decodes to an object
 * that encodes back to the same bytes.
 */
export function decodeFields<T extends object>(
  raw: unknown,
  defaults: T,
  schema: { readonly [K in keyof T]-?: StoredFieldKind },
): T | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const kinds: Readonly<Record<string, StoredFieldKind>> = schema;
  // Written by field name below; T's own keys say nothing about an index signature.
  const decoded = { ...defaults } as Record<string, unknown>;
  for (const [field, value] of Object.entries(raw)) {
    if (Object.hasOwn(kinds, field) && typeof value === kinds[field]) decoded[field] = value;
  }
  // Every key of T is either a default or a stored value checked against T's schema.
  return decoded as T;
}

/**
 * Yes/no flags stored as the literal string 'true', absent meaning no — the
 * encoding the tutorial and permission-denial flags already use on devices.
 * These do not catch: each caller keeps its own fail-safe.
 */
const FLAG_SET = 'true';

export async function readFlag(key: string): Promise<boolean> {
  return (await AsyncStorage.getItem(key)) === FLAG_SET;
}

export async function setFlag(key: string): Promise<void> {
  await AsyncStorage.setItem(key, FLAG_SET);
}

export async function clearFlag(key: string): Promise<void> {
  await AsyncStorage.removeItem(key);
}
