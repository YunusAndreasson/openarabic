import { beforeEach, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { createHookTestWrapper } from '@/__tests__/helpers/hookMocks';
import { AccountGateActions, PracticeGate } from '@/components/auth/PracticeGate';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';

jest.mock('expo-router', () => ({
  router: { navigate: jest.fn(), push: jest.fn() },
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

test('either authentication action carries the exact pending save and requests the stack anchor', () => {
  render(<AccountGateActions saveIntent="reader-intent" />, renderOptions());
  fireEvent.press(screen.getByText(STRINGS.SIGN_IN));
  expect(router.push).toHaveBeenCalledWith(
    { pathname: ROUTE_PATHS.AUTH_SIGN_IN, params: { saveIntent: 'reader-intent' } },
    { withAnchor: true },
  );
  fireEvent.press(screen.getByText(STRINGS.CREATE_ACCOUNT));
  expect(router.push).toHaveBeenCalledWith(
    { pathname: ROUTE_PATHS.AUTH_SIGN_UP, params: { saveIntent: 'reader-intent' } },
    { withAnchor: true },
  );
});
