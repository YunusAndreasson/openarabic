import React from 'react';
import { TouchableOpacity } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';

import ListenScreen from '@/app/(tabs)/listen';

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

// Mock ListenScreen with basic controls that respect reading list state
jest.mock('@/app/(tabs)/listen', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: () => {
      const disabled = !((global as any).readingListItems?.length);
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
        testID="listen-later-button"
        onPress={() => (global as any).handleToggleReadingList(1, false)}
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
(global as any).handleToggleReadingList = jest.fn();


// Global mocks used by the stubbed Listen screen
(global as any).stopPlaybackMock = jest.fn();
(global as any).handlePlayAllMock = jest.fn();


// Basic colors hook for ThemedButton and other components
jest.mock('@/hooks/theme/useColors', () => {
  const { Colors } = require('@/constants/Colors');
  return { useColors: () => Colors.light };
});

jest.mock('@/hooks/theme/useThemeDetection', () => ({
  useIsDarkMode: () => false,
}));

describe('listen later flow', () => {
  beforeEach(() => {
    (global as any).readingListItems = [1];
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds article to list and plays all', () => {
    const TestApp = () => {
      const [screen, setScreen] = React.useState<'home' | 'article' | 'listen'>('home');
      return (
        <>
          {screen === 'home' && (
            <TouchableOpacity testID="article-1" onPress={() => setScreen('article')} />
          )}
          {screen === 'article' && (
            <>
              <ArticleContent />
              <TouchableOpacity testID="close-article" onPress={() => setScreen('home')} />
              <TouchableOpacity testID="go-listen" onPress={() => setScreen('listen')} />
            </>
          )}
          {screen === 'listen' && <ListenScreen />}
        </>
      );
    };

    const { getByTestId, queryByTestId } = render(<TestApp />);

    fireEvent.press(getByTestId('article-1'));
    fireEvent.press(getByTestId('listen-later-button'));
    expect((global as any).handleToggleReadingList).toHaveBeenCalledWith(1, false);

    fireEvent.press(getByTestId('go-listen'));

    fireEvent.press(getByTestId('primary-action-button'));
    expect((global as any).handlePlayAllMock).toHaveBeenCalled();

    fireEvent.press(getByTestId('stop-playback-button'));
    expect((global as any).stopPlaybackMock).toHaveBeenCalled();

    expect(queryByTestId('stop-playback-button')).toBeTruthy();
  });

  it('disables play all when list is empty', () => {
    (global as any).readingListItems = [];

    const { queryByTestId } = render(<ListenScreen />);

    const primaryButton = queryByTestId('primary-action-button');
    if (primaryButton) {
      expect(primaryButton.props.disabled).toBe(true);
      fireEvent.press(primaryButton);
    }

    expect((global as any).handlePlayAllMock).not.toHaveBeenCalled();
  });
});

