import { beforeEach, expect, jest, test } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';

import FirstPage from '@/app/first-page';
import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { mockReviewStorage } from '@/__tests__/helpers/reviewStorage';
import { ToastProvider } from '@/components/providers';
import { STORAGE_KEYS } from '@/constants/storageKeys';
import { STRINGS } from '@/constants/strings';
import { readerSaveReceipt } from '@/services/readerSaveRpc';
import { createReaderSaveJournal, readerSave } from '@/services/readerSave';

jest.mock('@gorhom/bottom-sheet', () => ({
  ...jest.requireActual<object>('../../__mocks__/@gorhom/bottom-sheet.js'),
  default: require('../helpers/MeasuredSheet').default,
}));
jest.mock('expo-router', () => ({ useIsFocused: () => true, router: { dismissTo: jest.fn() } }));
jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('expo-audio', () => ({ useAudioPlayer: () => ({}), useAudioPlayerStatus: () => ({}) }));
let mockOwner: string | undefined;
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({
    session: mockOwner ? { user: { id: mockOwner } } : null,
  }),
}));
jest.mock('@/services/readerSaveRpc', () => ({ readerSaveReceipt: jest.fn() }));
jest.mock('@/services/widgets/storage', () => ({ keepWidgetOccurrence: async () => {} }));
jest.mock('@/services/analytics', () => ({ analytics: { track: jest.fn() } }));
jest.mock('@/components/auth/SocialAuthButtons', () => ({ SocialAuthButtons: () => null }));
jest.mock('@/hooks/auth/useAppleAuth', () => ({ useAppleAuth: () => ({ loading: false }) }));
jest.mock('@/hooks/auth/useGoogleAuth', () => ({ useGoogleAuth: () => ({ loading: false }) }));
jest.mock('@/utils/network', () => ({ isKnownOffline: async () => false }));
const mockSend = jest.fn(async (_request: unknown) => ({ error: null }));
jest.mock('@/services/supabase', () => ({
  supabase: { auth: { signInWithOtp: (request: unknown) => mockSend(request) } },
}));

beforeEach(() => {
  mockOwner = undefined;
  mockReviewStorage();
  // A new JS process starts with an unread journal backed by the same storage.
  Object.assign(readerSave, createReaderSaveJournal(AsyncStorage));
  mockSend.mockResolvedValue({ error: null });
  jest
    .mocked(AppState.addEventListener)
    .mockReturnValue({ remove: jest.fn() } as unknown as ReturnType<
      typeof AppState.addEventListener
    >);
});

function layoutSheets() {
  for (const sheet of screen.queryAllByTestId('native-sheet')) fireEvent(sheet, 'layout');
}

function openReader() {
  const { wrapper } = createHookTestWrapper({ withRedux: true });
  render(
    <ToastProvider>
      <FirstPage />
    </ToastProvider>,
    { wrapper },
  );
  layoutSheets();
}

test('a guest opens the word card, adds the book, and reaches email and six-digit code entry', async () => {
  openReader();
  fireEvent.press(screen.getByLabelText('كتابًا'));
  layoutSheets();
  fireEvent.press(screen.getByText(STRINGS.ADD_TO_PRACTICE));
  await waitFor(() => expect(readerSave.snapshot()?.shown).toBe(true));
  layoutSheets();
  expect(screen.getByText(STRINGS.TRACK_THIS_WORD)).toBeTruthy();
  fireEvent.press(screen.getByText(STRINGS.FIRST_PAGE_EMAIL));
  fireEvent.changeText(
    await screen.findByLabelText(STRINGS.EMAIL_ADDRESS_LABEL),
    'reader@example.org',
  );
  fireEvent.press(screen.getByText(STRINGS.SEND_EMAIL_CODE));
  const input = await screen.findByLabelText(STRINGS.EMAIL_CODE);
  fireEvent.changeText(input, '0123456');
  expect(input.props.value).toBe('012345');
  expect(mockSend).toHaveBeenCalledWith({
    email: 'reader@example.org',
    options: { shouldCreateUser: true, data: { reader_signup_intent: readerSave.snapshot()?.id } },
  });
  fireEvent.press(screen.getByText(STRINGS.READER_NOT_NOW));
  await screen.findByLabelText('كتابًا');
  expect(readerSave.snapshot()).toBeNull();
});

test('a cold launch restores an already-shown auth sheet, and dismissing restores all reader actions', async () => {
  await AsyncStorage.setItem(
    STORAGE_KEYS.READER_SAVE,
    JSON.stringify({
      version: 1,
      id: 'stored-save',
      word: {
        source: 'first_run_reader',
        occurrenceId: 59284,
        rootId: 9470,
        form: 'رَأَيْتُ',
        gloss: 'I saw',
      },
      method: 'long_press',
      phase: 'auth',
      shown: true,
    }),
  );
  openReader();
  await waitFor(() => expect(readerSave.snapshot()?.id).toBe('stored-save'));
  layoutSheets();
  expect(screen.getByText('I saw')).toBeTruthy();
  fireEvent.press(screen.getByText(STRINGS.READER_NOT_NOW));
  await waitFor(() => expect(readerSave.snapshot()).toBeNull());
  expect(await AsyncStorage.getItem(STORAGE_KEYS.READER_SAVE)).toBeNull();
  fireEvent.press(screen.getByLabelText(STRINGS.SIGN_IN));
  layoutSheets();
  expect(screen.getByText(STRINGS.FIRST_PAGE_EMAIL)).toBeTruthy();
  fireEvent.press(screen.getByText(STRINGS.READER_NOT_NOW));
  fireEvent.press(screen.getByLabelText(STRINGS.FIRST_PAGE_AUDIO_OPTIONS));
  expect(screen.getByText(STRINGS.PLAYBACK_SPEED)).toBeTruthy();
  fireEvent.press(screen.getByText(STRINGS.FIRST_PAGE_BACK));
  fireEvent.press(screen.getByLabelText('كَنْزٍ'));
  expect(screen.getByText('a treasure')).toBeTruthy();
  fireEvent.press(screen.getByText(STRINGS.ADD_TO_PRACTICE));
  await waitFor(() => expect(readerSave.snapshot()?.word.occurrenceId).toBe(59291));
  layoutSheets();
  expect(screen.getByText(STRINGS.TRACK_THIS_WORD)).toBeTruthy();
});

test('Keep reading releases the word cards during a signed-in write and preserves the intent until its receipt', async () => {
  mockOwner = 'reader';
  let acknowledge!: () => void;
  jest.mocked(readerSaveReceipt).mockImplementationOnce(
    () =>
      new Promise<'saved'>(resolve => {
        acknowledge = () => resolve('saved');
      }),
  );
  openReader();
  fireEvent.press(screen.getByLabelText('كتابًا'));
  layoutSheets();
  fireEvent.press(screen.getByText(STRINGS.ADD_TO_PRACTICE));
  await waitFor(() => expect(readerSaveReceipt).toHaveBeenCalledTimes(1));
  layoutSheets();
  fireEvent.press(screen.getByText(STRINGS.KEEP_READING));
  await screen.findByLabelText('رَأَيْتُ');
  expect(readerSave.snapshot()).toMatchObject({
    phase: 'ready',
    owner: mockOwner,
    keepReading: true,
    word: { occurrenceId: 59285 },
  });
  fireEvent.press(screen.getByLabelText('رَأَيْتُ'));
  expect(screen.getByText('I saw')).toBeTruthy();
  acknowledge();
  await waitFor(() => expect(readerSave.snapshot()).toBeNull());
  expect(screen.getByText('I saw')).toBeTruthy();
  expect(readerSaveReceipt).toHaveBeenCalledTimes(1);
});
