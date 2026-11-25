import { beforeEach, expect, jest, test } from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { useWordWidgetSync } from '@/hooks/app/useWordWidgetSync';
import { wordWidget } from '@/widgets/WordInContext.ios';
import { wordWidget as androidWordWidget } from '@/widgets/WordInContext.android';
import { AppState, Platform } from 'react-native';
import { createTestWord } from '@/__tests__/helpers/fsrsTestHelpers';
import { mockReviewStorage } from '@/__tests__/helpers/reviewStorage';
import type { RootId } from '@/types/branded.types';
import { readWidgetCopy, keepWidgetOccurrence } from '@/services/widgets/storage';
import {
  clearWordWidget,
  resumeWidgetGeneration,
  restoreWidgetSession,
  currentWidgetRevision,
  invalidateWordWidget,
  publishDeck,
  widgetOwner,
  widgetPreview,
} from '@/services/widgets/publish';
import { widgetBridge } from '@/services/widgets/native';

jest.mock('@/services/widgets/native', () => ({
  widgetBridge: { setOwner: jest.fn(), matchesOwner: jest.fn() },
}));
jest.mock('@/widgets/WordInContext.ios', () => ({ wordWidget: { updateTimeline: jest.fn() } }));
jest.mock('@/widgets/WordInContext.android', () => ({ wordWidget: { updateSnapshot: jest.fn() } }));
jest.mock('@/widgets/OpenText.ios', () => ({ publicWidget: { updateTimeline: jest.fn() } }));
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'leaving' }, isLoading: false }),
}));
jest.mock('@/utils/network', () => ({ isKnownOffline: async () => false }));
jest.mock('@/services/studyWordsFSRS', () => ({
  studyWordsFSRSService: { getFSRSWords: async () => [mockDeckWord] },
}));
jest.mock('@/services/widgets/placement', () => ({
  observePlacement: async () => undefined,
  widgetInstallTime: async () => 0,
}));
const installed = +new Date(2026, 10, 24, 8);
const root = 18276 as RootId;
const word = createTestWord({
  root_id: root,
  fsrs_state: 2,
  fsrs_due: new Date(installed + 3600_000).toISOString(),
});
const mockDeckWord = { ...word, root: { letters: 'وَرْد', meaning: 'rose' } };
beforeEach(() => {
  mockReviewStorage();
  jest.replaceProperty(Platform, 'OS', 'ios');
  jest.setSystemTime(installed);
  jest
    .mocked(widgetBridge!.setOwner)
    .mockImplementation(owner => (owner ? owner + '-generation' : ''));
  clearWordWidget();
});
test('a pending full query cannot overwrite an account change; sign-out purges the native personal timeline', async () => {
  widgetOwner('first', installed);
  const pending = publishDeck('first', [word], installed, installed);
  widgetOwner('second', installed);
  await pending;
  expect(widgetPreview()?.generation).toBe('');
  expect(await readWidgetCopy('first')).toBeUndefined();
  await keepWidgetOccurrence('second', {
    rootId: root,
    occurrenceId: 59291,
    form: 'كَنْزٍ',
    gloss: 'a treasure',
    source: 'first_run_reader',
  });
  await publishDeck('second', [word], installed, installed);
  expect(widgetPreview()).toMatchObject({
    generation: 'second-generation',
    arabic: 'كَنْزٍ',
    due: false,
  });
  invalidateWordWidget('second', installed, 'Checking');
  expect(widgetPreview()).toMatchObject({
    kind: 'Checking',
    due: true,
    reveal: false,
    status: expect.stringMatching(/^As of/),
  });
  clearWordWidget();
  expect(widgetPreview()?.generation).toBe('');
  await publishDeck('second', [word], installed, installed);
  expect(widgetPreview()?.generation).toBe('');
});

test('foreground sync during pending sign-out cannot reacquire the private generation', async () => {
  const sub = jest.spyOn(AppState, 'addEventListener');
  const { wrapper } = createHookTestWrapper();
  const view = renderHook(() => useWordWidgetSync(), { wrapper });
  await waitFor(() => expect(widgetPreview()?.generation).toBe('leaving-generation'));
  clearWordWidget();
  const listener = sub.mock.calls.filter(([event]) => event === 'change').at(-1)![1];
  await act(async () => listener('active'));
  expect(widgetPreview()?.generation).toBe('');
  expect(widgetBridge!.setOwner).toHaveBeenLastCalledWith('');
  view.unmount();
});
test('revocation survives a public render failure and retries the public face', async () => {
  widgetOwner('private', installed);
  await publishDeck('private', [word], installed, installed);
  jest.mocked(wordWidget.updateTimeline).mockImplementationOnce(() => {
    throw new Error('host timeline unavailable');
  });
  expect(() => clearWordWidget()).not.toThrow();
  await waitFor(() => expect(widgetPreview()?.generation).toBe(''));
  expect(widgetBridge!.setOwner).toHaveBeenLastCalledWith('');
});

test('a headless sync cannot recreate a generation another runtime revoked', async () => {
  widgetOwner('background-owner', installed);
  await publishDeck('background-owner', [word], installed, installed);
  jest.mocked(widgetBridge!.matchesOwner).mockReturnValue(false);
  const claims = jest.mocked(widgetBridge!.setOwner).mock.calls.length;
  await expect(resumeWidgetGeneration('background-owner', currentWidgetRevision())).resolves.toBe(
    false,
  );
  expect(widgetBridge!.setOwner).toHaveBeenCalledTimes(claims);
});

test('only a failed account transition or a fresh authenticated session can release its fence', async () => {
  widgetOwner('returning', installed);
  const failed = clearWordWidget('returning');
  widgetOwner('returning', installed);
  expect(widgetBridge!.setOwner).toHaveBeenLastCalledWith('');
  failed();
  widgetOwner('returning', installed);
  expect(widgetBridge!.setOwner).toHaveBeenLastCalledWith('returning');
  clearWordWidget('returning');
  widgetOwner('returning', installed);
  expect(widgetBridge!.setOwner).toHaveBeenLastCalledWith('');
  restoreWidgetSession('returning');
  widgetOwner('returning', installed);
  expect(widgetBridge!.setOwner).toHaveBeenLastCalledWith('returning');
});

test('Android receives a JSON-safe public rotation and saved faces across the native bridge', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  widgetOwner('android-qa', installed);
  await keepWidgetOccurrence('android-qa', {
    rootId: root,
    occurrenceId: 59291,
    form: 'كَنْزٍ',
    gloss: 'a treasure',
    source: 'first_run_reader',
  });
  await publishDeck('android-qa', [word], installed, installed);
  const snapshot = jest.mocked(androidWordWidget.updateSnapshot).mock.calls.at(-1)?.[0];
  expect(snapshot).toStrictEqual(JSON.parse(JSON.stringify(snapshot)));
  expect(snapshot?.publicRotation).toMatchObject({
    firstUse: installed,
    faces: expect.arrayContaining([
      expect.objectContaining({ passagePosition: '0.8', generation: '' }),
    ]),
  });
  expect(snapshot?.frames?.[0]?.face).toMatchObject({
    generation: 'android-qa-generation',
    rootId: root,
  });
});
