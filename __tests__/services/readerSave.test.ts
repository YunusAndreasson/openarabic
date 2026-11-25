import { describe, expect, jest, test } from '@jest/globals';
import { startReaderAttempt } from '@/services/readerSaveAuth';
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
import type { RootId } from '@/types/branded.types';
import {
  canResumeReaderSave,
  createReaderSaveJournal,
  readerSave,
  type SaveWord,
} from '@/services/readerSave';
import {
  bindReaderResponse,
  captureReaderExchange,
  withReaderExchange,
} from '@/services/readerAuthExchange';

const word = (n: number): SaveWord => ({
  source: 'first_run_reader',
  rootId: n as RootId,
  occurrenceId: n + 100,
  form: 'form',
  gloss: 'gloss',
});
function disk() {
  let raw: string | null = null;
  return {
    getItem: async () => raw,
    setItem: async (_key: string, value: string) => {
      raw = value;
    },
    removeItem: async () => {
      raw = null;
    },
  };
}
describe('durable reader Add', () => {
  test('restart retains the exact occurrence, provider and code destination. Not now survives another restart', async () => {
    const storage = disk();
    const first = createReaderSaveJournal(storage);
    const save = (await first.begin(word(4), 'sheet'))!;
    await first.change(save.id, s => ({
      ...s,
      attempt: { id: 'mail', provider: 'email_code' },
      codeAddress: 'a@example.org',
    }));
    const restored = createReaderSaveJournal(storage);
    expect(await restored.load()).toMatchObject({
      word: word(4),
      id: save.id,
      phase: 'auth',
      codeAddress: 'a@example.org',
    });
    await restored.change(save.id, () => null);
    expect(await createReaderSaveJournal(storage).load()).toBeNull();
  });
  test('dictionary saves restore the selected root and coalesce only that entry', async () => {
    const storage = disk();
    const journal = createReaderSaveJournal(storage);
    const headword = {
      source: 'dictionary',
      rootId: 12 as RootId,
      form: 'كتاب',
      gloss: 'book',
    } as const;
    const first = await journal.begin(headword, 'sheet');
    const restored = createReaderSaveJournal(storage);
    expect(await restored.load()).toMatchObject({ word: headword, phase: 'auth' });
    expect((await restored.begin(headword, 'sheet'))?.id).toBe(first?.id);
    const next = await restored.begin({ ...headword, rootId: 13 as RootId }, 'sheet');
    expect(next?.id).not.toBe(first?.id);
    expect(next?.word.rootId).toBe(13);
  });

  test('a receipt requires its owner, while an interrupted provider exchange can resume signed out', async () => {
    const journal = createReaderSaveJournal(disk());
    const save = (await journal.begin(word(4), 'sheet', 'owner'))!;
    expect(canResumeReaderSave({ ...save, phase: 'saved' })).toBe(false);
    expect(canResumeReaderSave(save, 'different')).toBe(false);
    expect(canResumeReaderSave(save, 'owner')).toBe(true);
    expect(canResumeReaderSave({ ...save, phase: 'auth' })).toBe(true);
  });
  test('double Add coalesces; an abandoned callback cannot bind a different selection even for the same root', async () => {
    const journal = createReaderSaveJournal(disk());
    const [a, duplicate] = await Promise.all([
      journal.begin(word(8), 'sheet'),
      journal.begin(word(8), 'sheet'),
    ]);
    expect(a?.id).toBe(duplicate?.id);
    await journal.change(a!.id, () => null);
    const next = await journal.begin({ ...word(8), occurrenceId: 19 }, 'long_press');
    await journal.change(a!.id, s => ({ ...s, owner: 'old-owner', phase: 'ready' }));
    expect(journal.snapshot()).toEqual(next);
    expect(journal.snapshot()?.owner).toBeUndefined();
  });
  test.each([
    { provider: 'apple', id_token: 'apple-credential' },
    { provider: 'google', id_token: 'google-credential' },
    { email: 'a@example.org', token: '012345', type: 'email' },
    { email: 'a@example.org', password: 'test-value' },
  ] as Record<string, string>[])(
    'only the initiating exchange can publish its owner before process death',
    async fields => {
      const storage = disk();
      const journal = createReaderSaveJournal(storage);
      const save = (await journal.begin(word(7), 'sheet'))!;
      await withReaderExchange(
        fields,
        async owner => {
          await journal.change(save.id, s => ({ ...s, owner, phase: 'ready' }));
        },
        async () => {
          expect(captureReaderExchange(JSON.stringify({ unrelated: true }))).toBeUndefined();
          const bind = captureReaderExchange(JSON.stringify({ ...fields, extra: 'sdk-field' }))!;
          await bindReaderResponse(bind, JSON.stringify({ error: 'invalid' }));
          expect(journal.snapshot()?.owner).toBeUndefined();
          await bindReaderResponse(
            bind,
            JSON.stringify({ access_token: 'unused', user: { id: 'owner' } }),
          );
          expect(await createReaderSaveJournal(storage).load()).toMatchObject({
            owner: 'owner',
            phase: 'ready',
            word: word(7),
          });
          for (const secret of [
            'apple-credential',
            'google-credential',
            '012345',
            'test-value',
            'unused',
          ])
            expect(await storage.getItem()).not.toContain(secret);
        },
      );
      expect(captureReaderExchange(JSON.stringify(fields))).toBeUndefined();
    },
  );
  test('a failed storage write never publishes a pending action', async () => {
    const store = createReaderSaveJournal({
      ...disk(),
      setItem: jest.fn<() => Promise<void>>().mockRejectedValue(new Error('full')),
    });
    await expect(store.begin(word(7), 'sheet')).rejects.toThrow('full');
    expect(store.snapshot()).toBeNull();
  });
});

test('provider cancellation and a late response cannot consume a subsequent Add', async () => {
  const save = (await readerSave.begin(word(8), 'sheet'))!;
  const attempt = (await startReaderAttempt(save.id, 'apple'))!;
  let oldBinding: ReturnType<typeof captureReaderExchange>;
  await attempt.exchange({ provider: 'apple', id_token: 'old-token' }, async () => {
    oldBinding = captureReaderExchange(
      JSON.stringify({ provider: 'apple', id_token: 'old-token' }),
    );
  });
  attempt.end('cancelled', 'provider_signin');
  await readerSave.load();
  expect(readerSave.snapshot()).toMatchObject({ word: word(8), phase: 'auth' });
  await readerSave.change(save.id, () => null);
  const next = (await readerSave.begin(word(9), 'sheet'))!;
  await oldBinding?.('other-owner');
  expect(readerSave.snapshot()).toEqual(next);
  await readerSave.change(next.id, () => null);
});
