import { expect, jest, test } from '@jest/globals';
import { runInNewContext } from 'node:vm';
import { wordWidget } from '@/widgets/WordInContext.android';
import { initialFace, type WordFace } from '@/widgets/edition';

jest.mock('expo-widgets', () => ({
  createWidget: (_name: string, render: unknown, seed: unknown) => ({ render, seed }),
}));
jest.mock('@expo/ui/jetpack-compose', () => ({
  Box: 'Box',
  Button: 'Button',
  Column: 'Column',
  Row: 'Row',
  Text: 'Text',
}));
jest.mock('@expo/ui/jetpack-compose/modifiers', () => ({
  background: () => null,
  cornerRadius: () => null,
  fillMaxSize: () => null,
  fillMaxWidth: () => null,
  height: () => null,
  padding: () => null,
  paddingAll: () => null,
  size: () => null,
}));
const widget = wordWidget as unknown as {
  render: (props: unknown, env: unknown) => unknown;
  seed: typeof initialFace;
};

function face(props: WordFace, revealed = false, widthDp = 328, fontScale = 1, allowed = true) {
  const view = (type: string, attributes: unknown) => ({ type, attributes });
  const fn =
    typeof widget.render === 'function'
      ? widget.render
      : (runInNewContext('(' + String(widget.render) + ')', {
          Date,
          _jsx: view,
          _jsxs: view,
          Box: 'Box',
          Button: 'Button',
          Column: 'Column',
          Row: 'Row',
          Text: 'Text',
          background: () => null,
          cornerRadius: () => null,
          fillMaxSize: () => null,
          fillMaxWidth: () => null,
          height: () => null,
          padding: () => null,
          paddingAll: () => null,
          size: () => null,
        }) as (props: unknown, env: unknown) => unknown);
  return JSON.stringify(
    fn(props, {
      widthDp,
      heightDp: 158,
      fontScale,
      seed: widget.seed,
      wordRevealed: revealed,
      wordCanReveal: allowed,
    }),
  );
}

test.each([130, 220, 328])('a %i dp widget hides its gloss until an explicit reveal', width => {
  const tree = face({ ...initialFace, reveal: true }, false, width);
  expect(tree).toContain(initialFace.arabic);
  expect(tree).toContain('Reveal meaning');
  expect(tree).not.toContain(initialFace.gloss);
  expect(tree.includes(initialFace.line)).toBe(width >= 296);
  expect(tree.includes(initialFace.credit)).toBe(width >= 208);
});

test('an eligible native instance reveal displays its gloss and preserves the word link', () => {
  expect(face(initialFace, true)).toContain(initialFace.gloss);
  const tree = face({ ...initialFace, due: true }, true, 328, 1, false);
  expect(tree).not.toContain(initialFace.gloss);
  expect(tree).not.toContain('Reveal meaning');
  expect(tree).toContain('"target":"word"');
});

test('large text gives the main word and response priority over the wide context line', () => {
  const tree = face(initialFace, true, 328, 2);
  expect(tree).toContain(initialFace.arabic);
  expect(tree).toContain(initialFace.gloss);
  expect(tree).not.toContain(initialFace.line);
  expect(tree).not.toContain(initialFace.credit);
});
