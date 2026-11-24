import { createSerialQueue } from '@/utils/createSerialQueue';
import { teardownPending } from '@/services/accountTeardown';
import { Directory, File, Paths } from 'expo-file-system';

import { PARAKEET_MODEL_ID, VOICE_HOTWORDS_SCORE } from '@/constants/voiceModel';
import { parakeetBpeVocab } from '@/utils/voiceHotwords';

/** The `createSTT` options that switch the recogniser to hotword decoding. */
export interface HotwordOptions {
  modelingUnit: 'bpe';
  bpeVocab: string;
  hotwordsFile: string;
  hotwordsScore: number;
}

const toPath = (file: File): string => file.uri.replace(/^file:\/\//, '');
/** The download manager hands back a bare path; Android's `File` needs a URI. */
const toUri = (path: string): string => (path.includes('://') ? path : `file://${path}`);

/**
 * Write the two files a biased recogniser is built from, and return the options
 * that point at them.
 *
 * Call it only once the previous engine has been destroyed: it overwrites the
 * files that engine was built from. Nothing is downloaded and the model archive
 * is left alone.
 */
const fileQueue = createSerialQueue();
export function purgeVoiceHotwords() {
  return fileQueue(async () => {
    const dir = new Directory(Paths.cache, 'voice-hotwords');
    if (dir.exists) dir.delete();
  });
}
export function prepareHotwordFiles(modelPath: string, hotwords: string) {
  return fileQueue(async () => {
    if (await teardownPending()) throw new Error('Account cleanup in progress');
    return writeHotwordFiles(modelPath, hotwords);
  });
}
async function writeHotwordFiles(modelPath: string, hotwords: string): Promise<HotwordOptions> {
  const root = new Directory(toUri(modelPath));
  let tokens = new File(root, 'tokens.txt');
  // Some download-manager versions keep the archive's enclosing directory.
  if (!tokens.exists) {
    const candidates = root
      .list()
      .filter((entry): entry is Directory => entry instanceof Directory)
      .map(dir => new File(dir, 'tokens.txt'))
      .filter(file => file.exists);
    const candidate = candidates[0];
    if (candidates.length !== 1 || !candidate) {
      throw new Error('Cannot locate Parakeet tokens.txt for hotwords');
    }
    tokens = candidate;
  }
  // Keyed by model: the vocabulary depends on nothing else, so it is derived
  // once and every later build writes only the hotwords.
  const dir = new Directory(Paths.cache, 'voice-hotwords', PARAKEET_MODEL_ID);
  dir.create({ intermediates: true, idempotent: true });
  const bpeVocab = new File(dir, 'bpe.vocab');
  const hotwordsFile = new File(dir, 'hotwords.txt');
  if (!bpeVocab.exists) await bpeVocab.write(parakeetBpeVocab(await tokens.text()));
  await hotwordsFile.write(hotwords);
  return {
    modelingUnit: 'bpe',
    bpeVocab: toPath(bpeVocab),
    hotwordsFile: toPath(hotwordsFile),
    hotwordsScore: VOICE_HOTWORDS_SCORE,
  };
}
