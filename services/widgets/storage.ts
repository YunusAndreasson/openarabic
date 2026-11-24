import { teardownPending } from '@/services/accountTeardown';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, scopedKey } from '@/constants/storageKeys';
import type { SaveWord } from '@/services/readerSave';
import { createSerialQueue } from '@/utils/createSerialQueue';
import { savedOccurrence, type Occurrences } from './plan';
import type { WordFace } from '@/widgets/edition';
const copyKey = (owner: string) => scopedKey(STORAGE_KEYS.WIDGET_COPY, owner);
export async function readWidgetCopy(owner: string): Promise<WordFace | undefined> {
  const raw = await AsyncStorage.getItem(copyKey(owner));
  return raw ? (JSON.parse(raw) as WordFace) : undefined;
}
export function storeWidgetCopy(owner: string, face?: WordFace) {
  return transaction(async () => {
    if (await teardownPending()) return;
    return face?.generation
      ? AsyncStorage.setItem(copyKey(owner), JSON.stringify(face))
      : AsyncStorage.removeItem(copyKey(owner));
  });
}
const transaction = createSerialQueue();
const key = (owner: string) => scopedKey(STORAGE_KEYS.WIDGET_WORDS, owner);
export async function readOccurrences(owner: string): Promise<Occurrences> {
  const raw = await AsyncStorage.getItem(key(owner));
  return raw ? (JSON.parse(raw) as Occurrences) : {};
}
export function keepWidgetOccurrence(owner: string, word: SaveWord) {
  return transaction(async () => {
    if (await teardownPending()) return;
    const words = await readOccurrences(owner);
    words[word.rootId] = savedOccurrence(word);
    await AsyncStorage.setItem(key(owner), JSON.stringify(words));
  });
}
export function removeWidgetOccurrence(owner: string, root: number) {
  return transaction(async () => {
    if (await teardownPending()) return;
    const words = await readOccurrences(owner);
    await AsyncStorage.removeItem(copyKey(owner));
    if (!words[root]) return;
    const { [root]: _removed, ...remaining } = words;
    await AsyncStorage.setItem(key(owner), JSON.stringify(remaining));
  });
}
