import { expect, test } from '@jest/globals';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { loadFirstPage } from '@/services/firstPage';
import { publicTimeline, savedOccurrence, wordTimeline } from '@/services/widgets/plan';
import type { RootId } from '@/types/branded.types';
import { initialFace } from '@/widgets/edition';
const now = +new Date(2026, 10, 23, 9, 41);
const due = now + 10 * 60_000;
const day = 24 * 3600_000;
const word = createTestWord({
  root_id: 18276 as RootId,
  fsrs_due: new Date(due).toISOString(),
  fsrs_state: 1,
});
const occurrence = savedOccurrence({
  source: 'first_run_reader',
  occurrenceId: 59291,
  rootId: word.root_id,
  form: 'كَنْزٍ',
  gloss: 'a treasure',
});
const deck = {
  words: [word],
  checked: now,
  lastCompletedAt: now,
  occurrences: { [word.root_id]: occurrence },
};
test('before launch and on day one the gallery matches the approved occurrence, diacritics and contiguous line', () => {
  const first = publicTimeline(now, now)[0]?.props;
  expect(first).toMatchObject({
    arabic: initialFace.arabic,
    line: initialFace.line,
    gloss: initialFace.gloss,
    reveal: false,
    generation: '',
  });
  expect(
    loadFirstPage().sentences[0]?.words.some(w => w.suggested && w.form === first?.arabic),
  ).toBe(true);
  expect(publicTimeline(now + day, now)[0]?.props.arabic).not.toBe(first?.arabic);
});
test('a learning word becomes due at its exact minute, even during the session cooldown', () => {
  const entries = wordTimeline(deck, 'owner-generation', now, now);
  expect(entries[0]?.props).toMatchObject({
    arabic: occurrence.arabic,
    occurrenceKey: 'word-59291',
    due: false,
    reveal: false,
    dueAt: due,
  });
  expect(entries.find(e => +e.date === due)?.props).toMatchObject({
    due: true,
    status: expect.stringContaining('1 due'),
  });
  expect(entries.at(-1)).toMatchObject({
    date: new Date(now + day),
    props: {
      generation: 'owner-generation',
      kind: 'Saved word',
      status: expect.stringMatching(/^As of/),
      reveal: false,
      dueAt: 0,
    },
  });
  expect(wordTimeline(deck, 'owner-generation', now + 5 * day, now)[0]?.props.generation).toBe('');
});
test('counts deduplicate the complete schedule, discard invalid due dates, and exempt New from cooldown', () => {
  const fresh = createTestWord({ root_id: 1 as RootId, fsrs_state: 0 });
  const reviewing = createTestWord({
    root_id: 2 as RootId,
    fsrs_state: 2,
    fsrs_due: new Date(now - 1000).toISOString(),
    fsrs_last_review: new Date(now).toISOString(),
  });
  const invalid = createTestWord({ root_id: 3 as RootId, fsrs_state: 2, fsrs_due: 'invalid' });
  const entries = wordTimeline(
    {
      ...deck,
      words: [fresh, fresh, reviewing, invalid],
      occurrences: { 1: occurrence, 2: occurrence },
    },
    'generation',
    now,
    now,
  );
  expect(entries[0]?.props.status).toMatch(/^1 due/);
  expect(entries.some(e => e.props.status.startsWith('2 due'))).toBe(true);
  expect(entries.length).toBeLessThanOrEqual(8);
});
test('unknown owner, missing deck, and a stale check produce a public face with no private metadata', () => {
  for (const entries of [
    wordTimeline(deck, '', now, now),
    wordTimeline({ ...deck, words: [] }, 'g', now, now),
    wordTimeline(deck, 'g', now + day, now),
  ]) {
    expect(entries.every(e => e.props.generation === '' && !e.props.due && !e.props.reveal)).toBe(
      true,
    );
  }
});

test('midnight rotation cannot displace the first due transition at 00:05', () => {
  const before = +new Date(2026, 10, 23, 23, 55);
  const at = before + 600000;
  const entries = wordTimeline(
    {
      ...deck,
      checked: before,
      lastCompletedAt: before,
      words: [{ ...word, fsrs_due: new Date(at).toISOString() }],
    },
    'g',
    before,
    before,
  );
  expect(entries.filter(e => +e.date <= at).at(-1)?.props.due).toBe(true);
});
