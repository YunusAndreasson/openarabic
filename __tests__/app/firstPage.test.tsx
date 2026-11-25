import { beforeEach, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { AppState } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import FirstPage from '@/app/first-page';
import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { ToastProvider } from '@/components/providers';
import { STRINGS } from '@/constants/strings';
import { readerSave } from '@/services/readerSave';
import { guestCanPractise, loadFirstPage } from '@/services/firstPage';

jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  useLocalSearchParams: jest.fn(),
  router: { dismissTo: jest.fn() },
}));
jest.mock('@/hooks/theme/useSkiaGpuAvailable', () => ({ useSkiaGpuAvailable: () => false }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
const mockPlay = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-audio', () => ({
  useAudioPlayer: () => ({ play: mockPlay, replace: mockReplace, setPlaybackRate: jest.fn() }),
  useAudioPlayerStatus: () => ({ playing: false }),
}));
jest.mock('@/hooks/auth/useAuth', () => ({ useAuth: () => ({ session: null }) }));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/components/auth/SocialAuthButtons', () => ({ SocialAuthButtons: () => null }));
jest.mock('@/hooks/auth/useAppleAuth', () => ({ useAppleAuth: () => ({ loading: false }) }));
jest.mock('@/hooks/auth/useGoogleAuth', () => ({ useGoogleAuth: () => ({ loading: false }) }));
jest.mock('@/components/ui/BrandedBottomSheet', () => ({
  BrandedBottomSheet: ({ isVisible, children }: { isVisible: boolean; children: ReactNode }) =>
    isVisible ? children : null,
}));

beforeEach(() => {
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(AppState.addEventListener).mockReturnValue({
    remove: jest.fn(),
  } as unknown as ReturnType<typeof AppState.addEventListener>);
});

test('a warm widget link can switch to the next word or return to the passage', () => {
  const { wrapper } = createHookTestWrapper({ withRedux: true });
  jest.mocked(useLocalSearchParams).mockReturnValue({ widgetPosition: '0.8', widgetWord: 'true' });
  const view = render(<FirstPage />, { wrapper });
  expect(screen.getByText('a treasure')).toBeTruthy();

  jest.mocked(useLocalSearchParams).mockReturnValue({ widgetPosition: '1.0', widgetWord: 'true' });
  view.rerender(<FirstPage />);
  expect(screen.queryByText('a treasure')).toBeNull();
  expect(screen.getByText('and indeed')).toBeTruthy();

  jest.mocked(useLocalSearchParams).mockReturnValue({ widgetPosition: '1.0' });
  view.rerender(<FirstPage />);
  expect(screen.queryByText('and indeed')).toBeNull();
  expect(screen.getByLabelText('وَلَقَدْ')).toBeTruthy();
});

test('a guest reads the bundled translation and opens and dismisses the contextual word in place', () => {
  const { wrapper } = createHookTestWrapper({ withRedux: true });
  render(<FirstPage />, { wrapper });
  const page = loadFirstPage();
  expect(screen.getByText(page.title)).toBeTruthy();
  expect(screen.getByText(page.sentences[0]!.translation)).toBeTruthy();
  expect(screen.getByLabelText(STRINGS.SIGN_IN)).toBeTruthy();
  expect(screen.getByLabelText(STRINGS.FIRST_PAGE_BROWSE)).toBeTruthy();
  fireEvent.press(screen.getByLabelText('كَنْزٍ'));
  expect(screen.getByText('a treasure')).toBeTruthy();
  expect(screen.getByText(STRINGS.WORD_ROOT_SECTION_TITLE)).toBeTruthy();
  fireEvent.press(screen.getByLabelText(STRINGS.FIRST_PAGE_BACK));
  expect(screen.queryByText('a treasure')).toBeNull();
  expect(screen.getByLabelText('كَنْزٍ')).toBeTruthy();
});

test('the excerpt and both exceptional words remain available offline', () => {
  const { wrapper } = createHookTestWrapper({ withRedux: true });
  render(<FirstPage />, { wrapper });
  const page = loadFirstPage();
  fireEvent.press(screen.getByLabelText(STRINGS.FIRST_PAGE_PLAY));
  expect(mockReplace).toHaveBeenCalledWith(page.audio);
  for (const form of ['أَرَهُ', 'وَقَعْتُ']) {
    expect(screen.getByLabelText(form)).toBeTruthy();
    fireEvent.press(screen.getByLabelText(form));
    const word = page.sentences[0]!.words.find(w => w.form === form)!;
    expect(screen.getByText(word.gloss)).toBeTruthy();
    expect(!!screen.queryByText(STRINGS.ADD_TO_PRACTICE)).toBe(!!word.practice);
    fireEvent.press(screen.getByLabelText(STRINGS.PLAY_AUDIO));
    expect(mockReplace).toHaveBeenCalledWith(word.audio);
    fireEvent.press(screen.getByLabelText(STRINGS.FIRST_PAGE_BACK));
  }
  expect(mockPlay).toHaveBeenCalledTimes(3);
});

test('an explicit Add can be dismissed and a long press then selects a different occurrence in the same session', async () => {
  const { wrapper } = createHookTestWrapper({ withRedux: true });
  render(
    <ToastProvider>
      <FirstPage />
    </ToastProvider>,
    { wrapper },
  );
  fireEvent.press(screen.getByLabelText('كَنْزٍ'));
  fireEvent.press(screen.getByText(STRINGS.ADD_TO_PRACTICE));
  const cancel = await screen.findByText(STRINGS.READER_NOT_NOW);
  expect(screen.getByText(STRINGS.TRACK_THIS_WORD)).toBeTruthy();
  expect(readerSave.snapshot()?.word.rootId).toBe(18276);
  fireEvent.press(cancel);
  await waitFor(() => expect(readerSave.snapshot()).toBeNull());
  fireEvent(screen.getByLabelText('كتابًا'), 'longPress');
  await screen.findByText(STRINGS.READER_NOT_NOW);
  expect(readerSave.snapshot()).toMatchObject({
    word: { rootId: 18274, occurrenceId: 59285 },
    method: 'long_press',
    phase: 'auth',
  });
  fireEvent.press(screen.getByText(STRINGS.READER_NOT_NOW));
  await waitFor(() => expect(readerSave.snapshot()).toBeNull());
});

test('the live guest reader also honors the omitted entry on the exported sentence', () => {
  const word = { sentence_id: 7106, position: 6, word_form: 'وَقَعْتُ', root_id: 16675 };
  expect(guestCanPractise(559, word)).toBe(false);
  expect(guestCanPractise(559, { ...word, position: 8, word_form: 'كَنْزٍ', root_id: 18276 })).toBe(
    true,
  );
});

test('all 18 offline lookups show the exported gloss and only mapped occurrences offer Add', () => {
  const { wrapper } = createHookTestWrapper({ withRedux: true });
  render(<FirstPage />, { wrapper });
  const seen = new Map<string, number>();
  const words = loadFirstPage().sentences.flatMap(line => line.words);
  expect(words).toHaveLength(18);
  for (const word of words) {
    const position = seen.get(word.form) ?? 0;
    seen.set(word.form, position + 1);
    const occurrence = screen.getAllByLabelText(word.form)[position]!;
    fireEvent.press(occurrence);
    expect(screen.getByText(word.gloss)).toBeTruthy();
    expect(screen.getByLabelText(STRINGS.PLAY_AUDIO)).toBeTruthy();
    expect(!!screen.queryByText(STRINGS.ADD_TO_PRACTICE)).toBe(!!word.practice);
    fireEvent.press(screen.getByLabelText(STRINGS.FIRST_PAGE_BACK));
  }
});

test('the native fallback shapes the complete inflected word on one line inside its tap target', () => {
  const { wrapper } = createHookTestWrapper({ withRedux: true });
  render(<FirstPage />, { wrapper });
  const text = screen.getByText('وَقَعْتُ', { includeHiddenElements: true });
  expect(text.props.children).toBe('وَقَعْتُ');
  expect(text.props.numberOfLines).toBe(1);
  expect(text.props.adjustsFontSizeToFit).toBe(true);
});
