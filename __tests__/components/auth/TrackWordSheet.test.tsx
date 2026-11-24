import { beforeEach, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { TrackWordSheet } from '@/components/first-page/TrackWordSheet';
import { STRINGS } from '@/constants/strings';
import { readerSave } from '@/services/readerSave';
import type { RootId } from '@/types/branded.types';
import { getSingleWordReviewRoute } from '@/utils/routeBuilders';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (route: unknown) => mockPush(route) },
  useIsFocused: () => true,
}));
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ session: { user: { id: 'owner' } } }),
}));
jest.mock('@/hooks/onboarding/useReaderSave', () => ({
  useReaderSaveCompletion: () => undefined,
  reportSaveError: jest.fn(),
}));
jest.mock('@/components/auth/ReaderSignIn', () => ({ ReaderSignIn: () => null }));
jest.mock('@/components/ui/BrandedBottomSheet', () => ({
  BrandedBottomSheet: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));

beforeEach(async () => {
  const old = await readerSave.load();
  if (old) await readerSave.change(old.id, () => null);
});
test('the receipt hands only the saved root to Review and clears the receipt', async () => {
  const word = {
    source: 'first_run_reader' as const,
    form: 'كَنْزٍ',
    gloss: 'a treasure',
    occurrenceId: 10,
    rootId: 21 as RootId,
  };
  const started = (await readerSave.begin(word, 'sheet', 'owner'))!;
  const saved = (await readerSave.change(started.id, s => ({ ...s, phase: 'saved' })))!;
  render(<TrackWordSheet save={saved} />);
  expect(screen.getByText(word.form)).toBeTruthy();
  expect(screen.getByText(STRINGS.TRACK_WORD_SAVED)).toBeTruthy();
  expect(screen.getByText(STRINGS.KEEP_READING)).toBeTruthy();
  fireEvent.press(screen.getByText(STRINGS.REVIEW_THIS_WORD));
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith(getSingleWordReviewRoute(word.rootId)));
  expect(readerSave.snapshot()).toBeNull();
});
