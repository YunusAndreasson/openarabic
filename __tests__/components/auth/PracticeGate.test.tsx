import { beforeEach, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { AccountGateActions, PracticeGate } from '@/components/auth/PracticeGate';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn() },
}));

const renderOptions = () => ({ wrapper: createHookTestWrapper({ withRedux: true }).wrapper });
beforeEach(() => {
  jest.clearAllMocks();
});

test('guest Practice explains the feature and allows continuing to Explore', () => {
  render(<PracticeGate />, renderOptions());
  expect(screen.getByText(STRINGS.PRACTICE_GATE_TITLE)).toBeTruthy();
  expect(screen.getByText(STRINGS.PRACTICE_GATE_REVIEW_DESC)).toBeTruthy();
  fireEvent.press(screen.getByText(STRINGS.KEEP_READING));
  expect(router.navigate).toHaveBeenCalledWith(ROUTE_PATHS.EXPLORE_TAB);
});

test('both authentication actions enter one choice route with the exact pending save', () => {
  render(<AccountGateActions saveIntent="reader-intent" />, renderOptions());
  fireEvent.press(screen.getByText(STRINGS.SIGN_IN));
  fireEvent.press(screen.getByText(STRINGS.CREATE_ACCOUNT));
  const accountChoice = { pathname: ROUTE_PATHS.AUTH, params: { saveIntent: 'reader-intent' } };
  expect(jest.mocked(router.navigate).mock.calls).toEqual([[accountChoice], [accountChoice]]);
});
