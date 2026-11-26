import { beforeEach, expect, jest, test } from '@jest/globals';
import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { Href } from 'expo-router';

import AuthScreen from '@/app/auth';
import SignInLink from '@/app/auth/sign-in';
import SignUpLink from '@/app/auth/sign-up';
import { PracticeGate } from '@/components/auth/PracticeGate';
import { SaveWordGate } from '@/components/auth/SaveWordGate';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import type { ReaderSave } from '@/services/readerSave';
import type { StartReaderAuth } from '@/services/readerSaveAuth';
import type { RootId } from '@/types/branded.types';

const save: ReaderSave = {
  version: 1,
  id: 'reader-intent',
  word: { source: 'dictionary', rootId: 5 as RootId, form: 'كِتَاب', gloss: 'book' },
  method: 'sheet',
  phase: 'auth',
  shown: true,
};
const mockNavigate = jest.fn<(href: Href) => void>();
const mockReplace = jest.fn();
const mockRootGoBack = jest.fn();
const mockNestedGoBack = jest.fn();
const mockIsFocused = jest.fn<() => boolean>();
const mockCanGoBack = jest.fn<() => boolean>();
const mockRedirect = jest.fn();
const mockNativeGoogle =
  jest.fn<(start?: StartReaderAuth, onCancel?: () => void) => Promise<void>>();
const mockStartReaderAttempt = jest.fn();
let mockParams: { saveIntent?: string };
let mockPending: ReaderSave | undefined;

jest.mock('expo-router', () => ({
  router: {
    navigate: (href: Href) => mockNavigate(href),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useIsFocused: () => true,
  useLocalSearchParams: () => mockParams,
  useNavigation: (path?: string) =>
    path === '/'
      ? { canGoBack: mockCanGoBack, goBack: mockRootGoBack }
      : { isFocused: mockIsFocused, goBack: mockNestedGoBack },
  Stack: {
    Screen: ({
      options,
    }: {
      options: { headerLeft?: () => ReactNode; headerRight?: () => ReactNode };
    }) => (
      <>
        {options.headerLeft?.()}
        {options.headerRight?.()}
      </>
    ),
  },
  Redirect: (props: { href: Href }) => {
    mockRedirect(props.href);
    return null;
  },
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetScrollView: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/components/ui', () => ({
  ...jest.requireActual<typeof import('@/components/ui')>('@/components/ui'),
  BrandedBottomSheet: ({ children }: { children: ReactNode }) => children,
}));
jest.mock('@/hooks/audio/useMiniPlayerClearance', () => ({ useMiniPlayerClearance: () => 0 }));
jest.mock('@/hooks/auth/useAuth', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('@/hooks/auth/useAppleAuth', () => ({
  useAppleAuth: () => ({ signInWithApple: jest.fn(), loading: false }),
}));
jest.mock('@/components/auth/NativeAppleSignIn', () => ({
  NativeAppleSignIn: ({ onPress }: { onPress: () => void }) => {
    const native = jest.requireMock<typeof import('react-native')>('react-native');
    return (
      <native.Pressable onPress={onPress} testID="apple-sign-in-button">
        <native.Text>Sign in with Apple</native.Text>
      </native.Pressable>
    );
  },
}));
jest.mock('@/hooks/auth/useGoogleAuth', () => ({
  useGoogleAuth: () => ({ signInWithGoogle: mockNativeGoogle, loading: false }),
}));
jest.mock('@/hooks/onboarding/useReaderSave', () => ({
  usePendingReaderSave: () => mockPending,
  useReaderSaveCompletion: () => undefined,
}));
jest.mock('@/services/readerSaveAuth', () => ({
  startReaderAttempt: (...args: unknown[]) => mockStartReaderAttempt(...args),
}));
jest.mock('@/hooks/auth/useAuthFormFields', () => ({
  useAuthFormFields: () => ({ email: '', password: '' }),
}));

beforeEach(() => {
  mockParams = {};
  mockPending = undefined;
  mockIsFocused.mockReturnValue(true);
  mockCanGoBack.mockReturnValue(true);
});

test.each(['Practice', 'Save word'] as const)('%s opens the full account choice', origin => {
  const fromWord = origin === 'Save word';
  const gate = render(fromWord ? <SaveWordGate save={save} /> : <PracticeGate />);
  const target = fromWord
    ? { pathname: ROUTE_PATHS.AUTH, params: { saveIntent: save.id } }
    : ROUTE_PATHS.AUTH;
  fireEvent.press(gate.getByText(STRINGS.SIGN_IN));
  fireEvent.press(gate.getByText(STRINGS.CREATE_ACCOUNT));
  expect(mockNavigate.mock.calls).toEqual([[target], [target]]);
  gate.unmount();

  if (fromWord) {
    mockParams = { saveIntent: save.id };
    mockPending = save;
  }
  const choice = render(<AuthScreen />);
  expect(choice.getByTestId('apple-sign-in-button')).toBeTruthy();
  expect(choice.getByText(STRINGS.SIGN_IN_WITH_EMAIL)).toBeTruthy();
  expect(choice.getByText(STRINGS.CREATE_ACCOUNT_WITH_EMAIL)).toBeTruthy();
  fireEvent.press(choice.getByLabelText(STRINGS.SIGN_IN_WITH_GOOGLE));
  const [start] = mockNativeGoogle.mock.calls[0] ?? [];
  if (fromWord) {
    expect(start).toEqual(expect.any(Function));
    void start?.('google');
    expect(mockStartReaderAttempt).toHaveBeenCalledWith(save.id, 'google');
  } else {
    expect(start).toBeUndefined();
  }
});

test.each([SignInLink, SignUpLink])(
  'legacy email links redirect to choice with their intent',
  Link => {
    mockParams = { saveIntent: save.id };
    render(<Link />);
    expect(mockRedirect).toHaveBeenCalledWith({
      pathname: ROUTE_PATHS.AUTH,
      params: { saveIntent: save.id },
    });
  },
);

test.each(['choice', 'sign-in', 'sign-up'] as const)(
  'Close from %s dismisses the root modal without popping the nested stack',
  stage => {
    const screen = render(<AuthScreen />);
    if (stage === 'sign-in') fireEvent.press(screen.getByText(STRINGS.SIGN_IN_WITH_EMAIL));
    if (stage === 'sign-up') fireEvent.press(screen.getByText(STRINGS.CREATE_ACCOUNT_WITH_EMAIL));
    fireEvent.press(screen.getByLabelText(STRINGS.CLOSE_A11Y));
    expect(mockRootGoBack).toHaveBeenCalledTimes(1);
    expect(mockNestedGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  },
);

test('email and its Back button change the local step without opening another auth route', () => {
  const screen = render(<AuthScreen />);
  fireEvent.press(screen.getByText(STRINGS.SIGN_IN_WITH_EMAIL));
  expect(screen.queryByText(STRINGS.SIGN_IN_WITH_GOOGLE)).toBeNull();
  fireEvent.press(screen.getByLabelText(STRINGS.AUTH_BACK_TO_OPTIONS));
  expect(screen.getByText(STRINGS.SIGN_IN_WITH_GOOGLE)).toBeTruthy();
  expect(mockNavigate).not.toHaveBeenCalled();
  expect(mockRootGoBack).not.toHaveBeenCalled();
  expect(mockNestedGoBack).not.toHaveBeenCalled();
});

test('a provider cancellation after dismissal leaves the original screen in place', () => {
  const screen = render(<AuthScreen />);
  fireEvent.press(screen.getByLabelText(STRINGS.SIGN_IN_WITH_GOOGLE));
  const [, cancel] = mockNativeGoogle.mock.calls[0] ?? [];
  expect(cancel).toEqual(expect.any(Function));
  mockIsFocused.mockReturnValue(false);
  cancel?.();
  expect(mockRootGoBack).not.toHaveBeenCalled();
  expect(mockReplace).not.toHaveBeenCalled();
});
