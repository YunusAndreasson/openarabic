import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { beforeEach, expect, jest, test } from '@jest/globals';

import { ReaderSignIn } from '@/components/auth/ReaderSignIn';
import { PRESS_LOCK_WINDOW_MS } from '@/constants/animation';
import { STRINGS } from '@/constants/strings';
import { readerSave } from '@/services/readerSave';
import type { RootId } from '@/types/branded.types';
import { analytics } from '@/services/analytics';

type SendRequest = {
  email: string;
  options: { shouldCreateUser: boolean; data?: { reader_signup_intent: string } };
};
type VerifyRequest = { email: string; token: string; type: string };
const mockSend = jest.fn<(request: SendRequest) => Promise<{ error: null }>>();
const mockVerify =
  jest.fn<
    (
      request: VerifyRequest,
    ) => Promise<{ error: null | { code: string }; data: { session: object | null } }>
  >();
jest.mock('@/services/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: (request: SendRequest) => mockSend(request),
      verifyOtp: (request: VerifyRequest) => mockVerify(request),
    },
  },
}));
jest.mock('@/utils/network', () => ({ isKnownOffline: async () => false }));
jest.mock('@/services/analytics', () => ({
  analytics: {
    track: jest.fn(),
    trackSignUp: jest.fn(),
    trackSignIn: jest.fn(),
    trackAuthFailed: jest.fn(),
  },
}));
jest.mock('@/components/auth/SocialAuthButtons', () => ({ SocialAuthButtons: () => null }));
jest.mock('@/components/auth/LegalLinks', () => ({ LegalLinks: () => null }));
jest.mock('@/components/auth/SignInForm', () => ({ SignInForm: () => null }));
jest.mock('@/hooks/auth/useAppleAuth', () => ({ useAppleAuth: () => ({ loading: false }) }));
jest.mock('@/hooks/auth/useGoogleAuth', () => ({ useGoogleAuth: () => ({ loading: false }) }));

beforeEach(() => {
  mockSend.mockResolvedValue({ error: null });
});

test('returning email never creates an account, retains a leading zero and retries an invalid code in place', async () => {
  render(<ReaderSignIn />);
  fireEvent.press(screen.getByText(STRINGS.FIRST_PAGE_EMAIL));
  fireEvent.changeText(screen.getByLabelText(STRINGS.EMAIL_ADDRESS_LABEL), ' reader@example.org ');
  fireEvent.press(screen.getByText(STRINGS.SEND_EMAIL_CODE));
  await screen.findByLabelText(STRINGS.EMAIL_CODE);
  expect(mockSend).toHaveBeenCalledWith({
    email: 'reader@example.org',
    options: { shouldCreateUser: false },
  });
  mockVerify
    .mockResolvedValueOnce({ error: { code: 'otp_expired' }, data: { session: null } })
    .mockResolvedValueOnce({ error: null, data: { session: {} } });
  fireEvent.changeText(screen.getByLabelText(STRINGS.EMAIL_CODE), '012 345');
  fireEvent.press(screen.getByText(STRINGS.VERIFY_EMAIL_CODE));
  await screen.findByText(STRINGS.EMAIL_CODE_ERROR);
  expect(mockVerify).toHaveBeenCalledWith({
    email: 'reader@example.org',
    token: '012345',
    type: 'email',
  });
  expect(analytics.trackSignIn).not.toHaveBeenCalled();
  jest.spyOn(Date, 'now').mockReturnValue(Date.now() + PRESS_LOCK_WINDOW_MS);
  fireEvent.changeText(screen.getByLabelText(STRINGS.EMAIL_CODE), '012346');
  fireEvent.press(screen.getByText(STRINGS.VERIFY_EMAIL_CODE));
  await waitFor(() => expect(analytics.trackSignIn).toHaveBeenCalledWith('email_code'));
});

test('resending and changing the address clear the old code', async () => {
  render(<ReaderSignIn />);
  fireEvent.press(screen.getByText(STRINGS.FIRST_PAGE_EMAIL));
  fireEvent.changeText(screen.getByLabelText(STRINGS.EMAIL_ADDRESS_LABEL), 'first@example.org');
  fireEvent.press(screen.getByText(STRINGS.SEND_EMAIL_CODE));
  fireEvent.changeText(await screen.findByLabelText(STRINGS.EMAIL_CODE), '123456');
  fireEvent.press(screen.getByText(STRINGS.RESEND_EMAIL_CODE));
  await waitFor(() => expect(screen.getByLabelText(STRINGS.EMAIL_CODE).props.value).toBe(''));
  fireEvent.press(screen.getByText(STRINGS.CHANGE_EMAIL_ADDRESS));
  fireEvent.changeText(screen.getByLabelText(STRINGS.EMAIL_ADDRESS_LABEL), 'second@example.org');
  fireEvent.press(screen.getByText(STRINGS.SEND_EMAIL_CODE));
  await waitFor(() =>
    expect(mockSend).toHaveBeenLastCalledWith({
      email: 'second@example.org',
      options: { shouldCreateUser: false },
    }),
  );
  expect(mockVerify).not.toHaveBeenCalled();
});

test('Track this word uses one code flow for account creation and restores the correct address after a mail handoff', async () => {
  const selected = (await readerSave.begin(
    {
      source: 'first_run_reader',
      occurrenceId: 9,
      rootId: 3 as RootId,
      form: 'كَنْزٍ',
      gloss: 'a treasure',
    },
    'sheet',
  ))!;
  const view = render(<ReaderSignIn save={selected} />);
  expect(screen.getByText(STRINGS.TRACK_THIS_WORD)).toBeTruthy();
  expect(screen.getByText('a treasure')).toBeTruthy();
  fireEvent.press(screen.getByText(STRINGS.FIRST_PAGE_EMAIL));
  fireEvent.changeText(
    await screen.findByLabelText(STRINGS.EMAIL_ADDRESS_LABEL),
    'new@example.org',
  );
  // The containing sheet subscribes to the persisted operation.
  view.rerender(<ReaderSignIn save={readerSave.snapshot()!} />);
  fireEvent.press(screen.getByText(STRINGS.SEND_EMAIL_CODE));
  await screen.findByLabelText(STRINGS.EMAIL_CODE);
  expect(mockSend).toHaveBeenCalledWith({
    email: 'new@example.org',
    options: { shouldCreateUser: true, data: { reader_signup_intent: selected.id } },
  });
  view.unmount();
  const pending = readerSave.snapshot()!;
  expect(pending.phase).toBe('auth');
  render(<ReaderSignIn save={pending} />);
  expect(screen.getByText('new@example.org')).toBeTruthy();
  expect(screen.getByLabelText(STRINGS.EMAIL_CODE).props.value).toBe('');
});
