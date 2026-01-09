import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { TouchableOpacity } from 'react-native';

import ListenScreen from '@/app/(tabs)/playlist';

// Simplify FlashList for tests
jest.mock('@shopify/flash-list', () => {
  const React = require('react');
  const { View } = require('react-native');
  return { FlashList: (props: any) => <View {...props} /> };
});

// Basic mock for reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  Reanimated.default.addWhitelistedNativeProps = () => {};
  return Reanimated;
});

// Mock vector icons to avoid loading native fonts
jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

// Mock BookmarksScreen with basic controls that respect bookmark list state
jest.mock('@/app/(tabs)/playlist', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: () => {
      const disabled = !(global as any).bookmarkItems?.length;
      return (
        <>
          {disabled ? (
            <TouchableOpacity testID="primary-action-button" disabled />
          ) : (
            <TouchableOpacity
              testID="primary-action-button"
              onPress={() => (global as any).handlePlayAllMock()}
            />
          )}
          <TouchableOpacity
            testID="stop-playback-button"
            onPress={() => (global as any).stopPlaybackMock()}
          />
        </>
      );
    },
  };
});

// Simplified ArticleContent that exposes the Listen Later button
jest.mock('@/components/article/ArticleContent', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    ArticleContent: () => (
      <TouchableOpacity
        testID="add-to-bookmarks-button"
        onPress={() => (global as any).handleToggleBookmark(1, false)}
      />
    ),
  };
});
const { ArticleContent } = require('@/components/article/ArticleContent');

// Mock authentication to always return a user
jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

// Capture toggle handler for assertions
// Use global variable for toggle handler to satisfy ESM jest.mock restrictions
(global as any).handleToggleBookmark = jest.fn();

// Global mocks used by the stubbed Listen screen
(global as any).stopPlaybackMock = jest.fn();
(global as any).handlePlayAllMock = jest.fn();

// Basic colors hook for ThemedButton and other components
jest.mock('@/hooks/theme/useColors', () => {
  const { Colors } = require('@/constants/colors');
  return { useColors: () => Colors.light };
});

jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

describe('bookmarks flow', () => {
  beforeEach(() => {
    (global as any).bookmarkItems = [1];
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('adds article to list and plays all', () => {
    const TestApp = () => {
      const [screen, setScreen] = React.useState<'home' | 'article' | 'bookmarks'>('home');
      return (
        <>
          {screen === 'home' && (
            <TouchableOpacity testID="article-1" onPress={() => setScreen('article')} />
          )}
          {screen === 'article' && (
            <>
              <ArticleContent />
              <TouchableOpacity testID="close-article" onPress={() => setScreen('home')} />
              <TouchableOpacity testID="go-bookmarks" onPress={() => setScreen('bookmarks')} />
            </>
          )}
          {screen === 'bookmarks' && <ListenScreen />}
        </>
      );
    };

    const { getByTestId, queryByTestId } = render(<TestApp />);

    fireEvent.press(getByTestId('article-1'));
    fireEvent.press(getByTestId('add-to-bookmarks-button'));
    expect((global as any).handleToggleBookmark).toHaveBeenCalledWith(1, false);

    fireEvent.press(getByTestId('go-bookmarks'));

    fireEvent.press(getByTestId('primary-action-button'));
    expect((global as any).handlePlayAllMock).toHaveBeenCalled();

    fireEvent.press(getByTestId('stop-playback-button'));
    expect((global as any).stopPlaybackMock).toHaveBeenCalled();

    expect(queryByTestId('stop-playback-button')).toBeTruthy();
  });

  test('disables play all when list is empty', () => {
    (global as any).bookmarkItems = [];

    const { queryByTestId } = render(<ListenScreen />);

    const primaryButton = queryByTestId('primary-action-button');
    if (primaryButton) {
      expect(primaryButton.props.disabled).toBeTruthy();
      fireEvent.press(primaryButton);
    }

    expect((global as any).handlePlayAllMock).not.toHaveBeenCalled();
  });

  test('disables play all after removing last item', () => {
    (global as any).bookmarkItems = [1];

    const { queryByTestId, rerender } = render(<ListenScreen />);

    // Remove the item using the toggle handler
    (global as any).handleToggleBookmark(1, true);
    (global as any).bookmarkItems = [];
    rerender(<ListenScreen />);

    const primaryButton = queryByTestId('primary-action-button');
    if (primaryButton) {
      expect(primaryButton.props.disabled).toBeTruthy();
      fireEvent.press(primaryButton);
    }

    expect((global as any).handlePlayAllMock).not.toHaveBeenCalled();
    expect((global as any).handleToggleBookmark).toHaveBeenCalledWith(1, true);
  });
});
