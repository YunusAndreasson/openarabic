/**
 * The article reader's route-level error boundary.
 *
 * The reader is a `fullScreenModal` with its swipe-down exit turned off, so on
 * iOS the only way out is its close button — and that button lived inside the
 * content that threw. The old inner boundary drew a text-only message there:
 * no retry, no close, nothing to tap. The route's own `ErrorBoundary` now draws
 * the screen fallback (with Refresh) beside a close button of its own.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

const mockCanDismiss = jest.fn<() => boolean>();
const mockDismiss = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    canDismiss: () => mockCanDismiss(),
    dismiss: (...args: unknown[]) => mockDismiss(...args),
    replace: (...args: unknown[]) => mockReplace(...args),
  },
  useLocalSearchParams: () => ({}),
}));

// The route module also builds the whole reader; only the two pieces the
// boundary draws are real here.
jest.mock('@/components/article', () => {
  const { Pressable, Text } = require('react-native');
  return {
    ArticleContent: () => null,
    ArticleSentence: () => null,
    FloatingActionButtons: () => null,
    WordDetailsBottomSheet: () => null,
    WordTooltip: () => null,
    ReaderCloseButton: ({ onClose }: { onClose: () => void }) => (
      <Pressable accessibilityRole="button" onPress={onClose}>
        <Text>close reader</Text>
      </Pressable>
    ),
  };
});

jest.mock('@/components/audio', () => ({
  AudioErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
  GlobalMiniPlayer: () => null,
}));

jest.mock('@/components/common', () => {
  const { Pressable, Text, View } = require('react-native');
  return {
    EmptyState: () => null,
    ErrorState: () => null,
    LoadingState: () => null,
    ScreenErrorFallback: ({ retry }: { retry: () => Promise<void> }) => (
      <View>
        <Text>fallback</Text>
        <Pressable accessibilityRole="button" onPress={() => void retry()}>
          <Text>refresh</Text>
        </Pressable>
      </View>
    ),
  };
});

jest.mock('@/components/providers', () => ({
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
  useToast: () => ({ showToast: jest.fn() }),
  useTutorialContext: () => ({ shouldShowTutorial: () => false, completeTutorial: jest.fn() }),
}));

jest.mock('@/hooks/articles/useArticleListen', () => ({ useArticleListen: jest.fn() }));
jest.mock('@/hooks/articles/useArticleScreen', () => ({ useArticleScreen: jest.fn() }));
jest.mock('@/hooks/articles/useReaderKeepAwake', () => ({ useReaderKeepAwake: jest.fn() }));
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

import { ErrorBoundary } from '@/app/article/[id]';
import { ROUTE_PATHS } from '@/constants/routes';

const renderBoundary = (retry = jest.fn(() => Promise.resolve())) => {
  render(<ErrorBoundary error={new Error('render failed')} retry={retry} />);
  return retry;
};

describe('article reader ErrorBoundary', () => {
  beforeEach(() => {
    mockCanDismiss.mockReturnValue(true);
  });

  test('draws the screen fallback and a way out', () => {
    renderBoundary();

    expect(screen.getByText('fallback')).toBeOnTheScreen();
    expect(screen.getByText('close reader')).toBeOnTheScreen();
  });

  test('Refresh renders the reader again', () => {
    const retry = renderBoundary();

    fireEvent.press(screen.getByText('refresh'));

    expect(retry).toHaveBeenCalledTimes(1);
  });

  test('close dismisses the modal back to what presented it', () => {
    renderBoundary();

    fireEvent.press(screen.getByText('close reader'));

    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('close lands on Explore when nothing presented the reader (cold deep link)', () => {
    mockCanDismiss.mockReturnValue(false);
    renderBoundary();

    fireEvent.press(screen.getByText('close reader'));

    expect(mockDismiss).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith(ROUTE_PATHS.EXPLORE_TAB);
  });
});
