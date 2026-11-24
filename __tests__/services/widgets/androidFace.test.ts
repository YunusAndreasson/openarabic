import { expect, jest, test } from '@jest/globals';
import { runInNewContext } from 'node:vm';
import { wordWidget } from '@/widgets/WordInContext.android';
import { initialFace } from '@/widgets/edition';

jest.mock('expo-widgets', () => ({
  createWidget: (_name: string, render: unknown, seed: unknown) => ({ render, seed }),
}));
jest.mock('@expo/ui/jetpack-compose', () => ({
  Button: 'Button',
  Column: 'Column',
  Image: 'Image',
  Row: 'Row',
  Text: 'Text',
}));
jest.mock('@expo/ui/jetpack-compose/modifiers', () => ({
  background: () => null,
  fillMaxSize: () => null,
  paddingAll: () => null,
  size: () => null,
}));
const widget = wordWidget as unknown as {
  render: (props: unknown, env: unknown) => unknown;
  seed: typeof initialFace;
};
function face(props: typeof initialFace, revealed = false, widthDp = 328) {
  const view = (type: string, attributes: unknown) => ({ type, attributes });
  const fn =
    typeof widget.render === 'function'
      ? widget.render
      : (runInNewContext('(' + String(widget.render) + ')', {
          Date,
          _jsx: view,
          _jsxs: view,
          Button: 'Button',
          Column: 'Column',
          Image: 'Image',
          Row: 'Row',
          Text: 'Text',
          background: () => null,
          fillMaxSize: () => null,
          paddingAll: () => null,
          size: () => null,
        }) as (props: unknown, env: unknown) => unknown);
  return JSON.stringify(
    fn(
      { ...widget.seed, ...props },
      { widthDp, heightDp: 150, seed: widget.seed, wordRevealed: revealed },
    ),
  );
}
test.each([130, 220, 328])(
  'a %i dp widget starts Arabic-only, including the TalkBack tree',
  width => {
    const tree = face({ ...initialFace, reveal: true }, false, width);
    expect(tree).toContain(initialFace.arabic);
    for (const hidden of [
      initialFace.gloss,
      initialFace.credit,
      initialFace.kind,
      initialFace.status,
    ])
      expect(tree).not.toContain(hidden);
    expect(tree).toContain('Button');
    expect(tree.includes(initialFace.line)).toBe(width >= 208);
  },
);
test('only an eligible native instance reveal can insert a gloss', () => {
  expect(face(initialFace, true)).toContain(initialFace.gloss);
  expect(face({ ...initialFace, generation: 'private' })).not.toContain(initialFace.gloss);
  for (const restriction of [
    { due: true },
    { dueAt: Date.now() - 1 },
    { expires: Date.now() - 1 },
  ]) {
    const tree = face({ ...initialFace, ...restriction }, true);
    expect(tree).not.toContain(initialFace.gloss);
    expect(tree).not.toContain('Button');
  }
});

test.each([130, 220, 328])(
  'a not-due personal face visibly labels its reveal control at %i dp',
  width => {
    const personal = {
      ...initialFace,
      kind: 'Practice word',
      generation: 'learner',
      dueAt: Date.now() + 60000,
    };
    const tree = face(personal, false, width);
    expect(tree).toContain('Practice word');
    expect(tree).toContain('Reveal meaning');
    expect(tree).not.toContain(personal.gloss);
    expect(face(personal, true, width)).not.toContain('Reveal meaning');
    expect(face({ ...personal, due: true }, false, width)).not.toContain('Reveal meaning');
  },
);
