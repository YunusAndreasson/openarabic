import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ScreenStateHandler } from '@/components/common/ScreenStateHandler';
import { STRINGS } from '@/constants/strings';

const ERROR = 'Could not load';

const renderHandler = (state: { isLoading?: boolean; isError?: boolean; isEmpty?: boolean }) => {
  const onRetry = jest.fn();
  render(
    <ScreenStateHandler
      isLoading={state.isLoading ?? false}
      isError={state.isError ?? false}
      errorMessage={ERROR}
      onRetry={onRetry}
      isEmpty={state.isEmpty}
      empty={<Text>Nothing yet</Text>}
    >
      <Text>Content</Text>
    </ScreenStateHandler>,
  );
  return { onRetry };
};

describe('ScreenStateHandler', () => {
  test('renders the content when there is nothing to stand in for', () => {
    renderHandler({});

    expect(screen.getByText('Content')).toBeTruthy();
  });

  test('reports a failure ahead of a source that is still loading', () => {
    const { onRetry } = renderHandler({ isError: true, isLoading: true });

    expect(screen.getByText(ERROR)).toBeTruthy();
    expect(screen.queryByText('Content')).toBeNull();

    fireEvent.press(screen.getByText(STRINGS.REFRESH));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('shows the empty state instead of the content', () => {
    renderHandler({ isEmpty: true });

    expect(screen.getByText('Nothing yet')).toBeTruthy();
    expect(screen.queryByText('Content')).toBeNull();
  });

  test('holds the empty state back while loading', () => {
    renderHandler({ isLoading: true, isEmpty: true });

    expect(screen.queryByText('Nothing yet')).toBeNull();
    expect(screen.queryByText('Content')).toBeNull();
  });
});
