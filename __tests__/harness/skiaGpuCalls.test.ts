/**
 * The app's JS and worklets make no GPU call.
 *
 * Each API below needs Skia's GPU device on the thread that calls it. Without
 * one (Dawn found no adapter) it throws, and a throw in a worklet on the UI
 * runtime takes the app down: `useTexture`'s bake did on the practice screen
 * (OPENARABIC-T7). On iOS the UI runtime is the main thread, where the same
 * call waits on the device's lock or for Metal to compile a pipeline (Zuhd's
 * 10–23 s launch hangs). Canvases draw on Skia's own render threads, and a
 * sprite reaches them as a raster image (`bakeRasterSprite`).
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, test } from '@jest/globals';
import ts from 'typescript';

const GPU_CALLS = new Set([
  // Bake a picture or image into a texture on the UI runtime.
  'useTexture',
  'usePictureAsTexture',
  'useImageAsTexture',
  // A GPU surface or texture, on the calling thread.
  'makeTextureImage',
  'MakeOffscreen',
  'MakeFromGPUTexture',
  'MakeGPUTextureFromImage',
  // An element drawn through an offscreen GPU surface and read back.
  'drawAsImage',
  'drawAsImageFromPicture',
  // A canvas ref is there to snapshot its view, which renders on the GPU.
  'useCanvasRef',
  'getNativeDevice',
]);

const ROOT = join(__dirname, '..', '..');
const SOURCE_DIRS = [
  'app',
  'components',
  'constants',
  'hooks',
  'lib',
  'services',
  'store',
  'utils',
];

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) && !entry.name.endsWith('.d.ts') ? [path] : [];
  });
}

/** Every identifier in the file that names a GPU call, as `line name`. Comments are not identifiers. */
function gpuCallsIn(fileName: string, text: string): string[] {
  const source = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && GPU_CALLS.has(node.text)) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
      found.push(`${line + 1} ${node.text}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe('Skia GPU calls', () => {
  test('the scan sees an import, a call and a property, and no comment', () => {
    const sample = [
      "import { useTexture } from 'react-native-skia';",
      '// MakeOffscreen is named here and not called',
      'const surface = Skia.Surface.MakeOffscreen(1, 1);',
      'const texture = image.makeTextureImage();',
    ].join('\n');

    expect(gpuCallsIn('sample.ts', sample)).toEqual([
      '1 useTexture',
      '3 MakeOffscreen',
      '4 makeTextureImage',
    ]);
  });

  test('none in app code', () => {
    const files = SOURCE_DIRS.flatMap(dir => sources(join(ROOT, dir)));
    expect(files.length).toBeGreaterThan(300);

    const found = files.flatMap(file =>
      gpuCallsIn(file, readFileSync(file, 'utf8')).map(hit => `${relative(ROOT, file)}:${hit}`),
    );
    expect(found).toEqual([]);
  });
});
