import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

import { createSerialQueue } from '@/utils/createSerialQueue';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import type { ArticleId, RootId } from '@/types/branded.types';

export type SaveProvider = 'apple' | 'google' | 'email_code' | 'password';
export type SaveMethod = 'sheet' | 'long_press';
export interface SaveWord {
  contextLine?: string;
  contextBefore?: string;
  contextAfter?: string;
  sourceCredit?: string;
  source: 'first_run_reader' | 'article';
  articleId?: ArticleId;
  sentenceId?: number;
  occurrenceId: number;
  rootId: RootId;
  form: string;
  gloss: string;
}

export interface ReaderSave {
  version: 1;
  id: string;
  word: SaveWord;
  method: SaveMethod;
  shown?: boolean;
  /** Keep reading while this account's acknowledged sign-in finishes the durable add. */
  keepReading?: boolean;
  reviewOffered?: boolean;
  verified?: boolean;
  offline?: boolean;
  refusal?: { reason: 'due-backlog' | 'daily-limit'; message: string };
  owner?: string;
  phase: 'auth' | 'ready' | 'failed' | 'saved' | 'existing';
  attempt?: { id: string; provider: SaveProvider };
  /** Only the destination for an outstanding code. Never persist codes, passwords or tokens. */
  codeAddress?: string;
}

/** A provider may return an owner immediately before the SDK persists its session. */
export function canResumeReaderSave(save: ReaderSave, owner?: string) {
  return !save.owner || save.owner === owner || (!owner && save.phase === 'auth');
}

const positive = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) && n > 0;
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
function isSave(v: unknown): v is ReaderSave {
  if (!record(v) || v['version'] !== 1 || typeof v['id'] !== 'string' || !record(v['word']))
    return false;
  const w = v['word'];
  return (
    (w['source'] === 'first_run_reader' ||
      (w['source'] === 'article' && positive(w['articleId']) && positive(w['sentenceId']))) &&
    positive(w['occurrenceId']) &&
    positive(w['rootId']) &&
    typeof w['form'] === 'string' &&
    typeof w['gloss'] === 'string' &&
    (v['method'] === 'sheet' || v['method'] === 'long_press') &&
    (v['phase'] === 'auth' ||
      (typeof v['owner'] === 'string' &&
        ['ready', 'failed', 'saved', 'existing'].includes(String(v['phase'])))) &&
    (v['owner'] === undefined || typeof v['owner'] === 'string') &&
    (v['keepReading'] === undefined ||
      v['keepReading'] === false ||
      (v['keepReading'] === true && ['ready', 'saved', 'existing'].includes(String(v['phase'])))) &&
    (v['verified'] === undefined || typeof v['verified'] === 'boolean') &&
    (v['codeAddress'] === undefined || typeof v['codeAddress'] === 'string') &&
    (v['attempt'] === undefined ||
      (record(v['attempt']) &&
        typeof v['attempt']['id'] === 'string' &&
        ['apple', 'google', 'email_code', 'password'].includes(String(v['attempt']['provider']))))
  );
}

/** Serialize compare-and-write across taps, delayed provider callbacks and remounts.
 * Publish only after the device has acknowledged the write. */
export function createReaderSaveJournal(
  storage: Pick<typeof AsyncStorage, 'getItem' | 'setItem' | 'removeItem'>,
) {
  let current: ReaderSave | null | undefined;
  const enqueue = createSerialQueue();
  const listeners = new Set<() => void>();
  const publish = (next: ReaderSave | null) => {
    current = next;
    for (const listener of listeners) listener();
  };
  async function read() {
    if (current === undefined) {
      const raw = await storage.getItem(STORAGE_KEYS.READER_SAVE);
      let value: unknown;
      try {
        value = raw && JSON.parse(raw);
      } catch {
        value = null;
      }
      publish(isSave(value) ? value : null);
    }
    return current ?? null;
  }
  function update(fn: (old: ReaderSave | null) => ReaderSave | null) {
    return enqueue(async () => {
      const old = await read();
      const next = fn(old);
      if (next === old) return old;
      if (next) await storage.setItem(STORAGE_KEYS.READER_SAVE, JSON.stringify(next));
      else await storage.removeItem(STORAGE_KEYS.READER_SAVE);
      publish(next);
      return next;
    });
  }
  return {
    snapshot: () => current,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    load: () => enqueue(read),
    begin: (word: SaveWord, method: SaveMethod, owner?: string) =>
      update(old => {
        if (
          old?.word.source === word.source &&
          old.word.articleId === word.articleId &&
          old.word.occurrenceId === word.occurrenceId &&
          old.phase === 'auth'
        )
          return old;
        if (old?.owner && !owner) return old;
        if (old?.owner && old.owner === owner && old.phase === 'ready')
          return old.keepReading ? { ...old, keepReading: false } : old;
        return {
          version: 1,
          id: randomUUID(),
          word,
          method,
          owner,
          phase: owner ? 'ready' : 'auth',
        };
      }),
    change: (id: string, fn: (old: ReaderSave) => ReaderSave | null) =>
      update(old => (old?.id === id ? fn(old) : old)),
    clearOwner: (owner: string) =>
      enqueue(async () => {
        const old = await read();
        if (old?.owner && old.owner !== owner) return;
        // A corrupt or unclaimed journal can still contain an email or a word.
        await storage.removeItem(STORAGE_KEYS.READER_SAVE);
        publish(null);
      }),
  };
}

export const readerSave = createReaderSaveJournal(AsyncStorage);
