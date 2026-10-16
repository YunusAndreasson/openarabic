/**
 * The two files a biased recogniser is built from.
 *
 * `expo-file-system` is replaced with an in-memory tree rather than the bare
 * global mock, because what matters here is WHICH paths are read and written:
 * the Android failure this guards was a path the real module refuses to open.
 */
import { PARAKEET_MODEL_ID } from '@/constants/voiceModel';
import { prepareHotwordFiles } from '@/services/voiceHotwordFiles';

const mockFiles = new Map<string, string>();
const mockDirectories = new Set<string>();

jest.mock('expo-file-system', () => {
  const join = (...parts: (string | { uri: string })[]): string =>
    parts.map(part => (typeof part === 'string' ? part : part.uri)).join('/');

  class File {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(...parts);
    }
    get exists(): boolean {
      return mockFiles.has(this.uri);
    }
    text(): Promise<string> {
      return Promise.resolve(mockFiles.get(this.uri) ?? '');
    }
    write(content: string): Promise<void> {
      mockFiles.set(this.uri, content);
      return Promise.resolve();
    }
  }

  class Directory {
    uri: string;
    constructor(...parts: (string | { uri: string })[]) {
      this.uri = join(...parts);
      // The real module throws on a path with no scheme on Android.
      if (!this.uri.includes('://')) throw new Error('URI is not absolute');
    }
    create(): void {
      mockDirectories.add(this.uri);
    }
    list(): Directory[] {
      return [...mockDirectories]
        .filter(
          uri => uri.startsWith(`${this.uri}/`) && !uri.slice(this.uri.length + 1).includes('/'),
        )
        .map(uri => new Directory(uri));
    }
  }

  return { Directory, File, Paths: { cache: { uri: 'file:///cache' } } };
});

const MODEL_PATH = '/data/files/sherpa-onnx/models/stt/parakeet';
const OUTPUT_DIR = `file:///cache/voice-hotwords/${PARAKEET_MODEL_ID}`;
const TOKENS = '<blk> 0\n\u2581the 1\n';

beforeEach(() => {
  mockFiles.clear();
  mockDirectories.clear();
});

it('opens the bare path the download manager hands back', async () => {
  mockFiles.set(`file://${MODEL_PATH}/tokens.txt`, TOKENS);

  const options = await prepareHotwordFiles(MODEL_PATH, 'book\nhouse\n');

  expect(options).toEqual({
    modelingUnit: 'bpe',
    // Native takes plain paths, not URIs.
    bpeVocab: `/cache/voice-hotwords/${PARAKEET_MODEL_ID}/bpe.vocab`,
    hotwordsFile: `/cache/voice-hotwords/${PARAKEET_MODEL_ID}/hotwords.txt`,
    hotwordsScore: 1,
  });
  expect(mockFiles.get(`${OUTPUT_DIR}/bpe.vocab`)).toBe('<blk>\t-1.0\n\u2581the\t-1.0\n');
  expect(mockFiles.get(`${OUTPUT_DIR}/hotwords.txt`)).toBe('book\nhouse\n');
});

it('derives the vocabulary once and rewrites only the hotwords', async () => {
  mockFiles.set(`file://${MODEL_PATH}/tokens.txt`, TOKENS);
  await prepareHotwordFiles(MODEL_PATH, 'book\nhouse\n');

  // A token table that would now fail to parse proves it is not read again.
  mockFiles.set(`file://${MODEL_PATH}/tokens.txt`, 'not a token table');
  await prepareHotwordFiles(MODEL_PATH, 'pen\nriver\n');

  expect(mockFiles.get(`${OUTPUT_DIR}/bpe.vocab`)).toBe('<blk>\t-1.0\n\u2581the\t-1.0\n');
  expect(mockFiles.get(`${OUTPUT_DIR}/hotwords.txt`)).toBe('pen\nriver\n');
});

it("finds the token table inside the archive's own directory", async () => {
  mockDirectories.add(`file://${MODEL_PATH}/extracted`);
  mockFiles.set(`file://${MODEL_PATH}/extracted/tokens.txt`, TOKENS);

  await prepareHotwordFiles(MODEL_PATH, 'book\nhouse\n');

  expect(mockFiles.get(`${OUTPUT_DIR}/bpe.vocab`)).toBe('<blk>\t-1.0\n\u2581the\t-1.0\n');
});

it('refuses a model with no token table rather than guess', async () => {
  await expect(prepareHotwordFiles(MODEL_PATH, 'book\nhouse\n')).rejects.toThrow(
    'Cannot locate Parakeet tokens.txt',
  );
  expect(mockFiles.size).toBe(0);
});
