import { expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';

import LegacyFirstPage from '@/app/first-page';
import { ROUTE_PATHS } from '@/constants/routes';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  Redirect: jest.fn(() => null),
}));

test('legacy passage links open the ordinary article reader', () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  render(<LegacyFirstPage />);
  expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0].href).toMatchObject({
    pathname: ROUTE_PATHS.ARTICLE,
    params: { id: 559 },
  });
});

test('a warm legacy widget link carries the new sentence and precise word to the reader', () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ widgetPosition: '0.8', widgetWord: 'true' });
  const { rerender } = render(<LegacyFirstPage />);
  expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0].href).toMatchObject({
    pathname: ROUTE_PATHS.ARTICLE,
    params: { id: 559, sentenceId: 7106, wordId: 59291 },
  });

  jest.mocked(useLocalSearchParams).mockReturnValue({ widgetPosition: '1.0', widgetWord: 'true' });
  rerender(<LegacyFirstPage />);
  expect(jest.mocked(Redirect).mock.calls.at(-1)?.[0].href).toMatchObject({
    pathname: ROUTE_PATHS.ARTICLE,
    params: { id: 559, sentenceId: 7107, wordId: 59292 },
  });
});
