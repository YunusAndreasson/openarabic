/**
 * EmptyState Component Tests
 *
 * Tests empty state placeholder with icon, text, and actions.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { fireEvent, render } from '@testing-library/react-native';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { EmptyState } from '@/components/common/EmptyState';

// Mock expo-router
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));

// Mock themed components
jest.mock('@/components/ThemedButton', () => {
  const { Pressable, Text } = require('react-native');
  const React = require('react');
  return {
    ThemedButton: ({
      title,
      onPress,
      testID,
    }: {
      title: string;
      onPress?: () => void;
      testID?: string;
    }) =>
      React.createElement(
        Pressable,
        { onPress, testID: testID || 'themed-button' },
        React.createElement(Text, null, title),
      ),
  };
});

jest.mock('@/components/ThemedText', () => {
  const { Text } = require('react-native');
  const React = require('react');
  return {
    ThemedText: ({ children }: { children: React.ReactNode }) =>
      React.createElement(Text, null, children),
  };
});

// Mock ListenListItemCard
jest.mock('@/components/bookmarks', () => ({
  ListenListItemCard: () => null,
}));

// Mock ListSeparator
jest.mock('@/components/common/ListSeparator', () => ({
  ListSeparator: () => null,
}));

// Mock theme hook
jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    Ionicons: ({ name }: { name: string }) => React.createElement(View, { testID: `icon-${name}` }),
  };
});

// Mock constants
jest.mock('@/constants/routes', () => ({
  ROUTE_PATHS: {
    EXPLORE_TAB: '/(tabs)/read',
  },
}));

jest.mock('@/constants/strings', () => ({
  STRINGS: {
    BROWSE_ARTICLES: 'Browse Articles',
  },
}));

// Mock utils
jest.mock('@/utils/storageUtils', () => ({
  generateStorageUrl: (_bucket: string, path: string) => path,
}));

jest.mock('@/utils/stringUtils', () => ({
  formatAuthorCategory: (author: string, category: string) => `${author} • ${category}`,
}));

describe('EmptyState', () => {
  const mockOnAction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders title and description', () => {
      const { getByText } = render(
        <EmptyState title="No Items" description="You have no items yet" />,
      );

      expect(getByText('No Items')).toBeTruthy();
      expect(getByText('You have no items yet')).toBeTruthy();
    });

    test('renders icon when provided', () => {
      const { getByTestId } = render(
        <EmptyState title="Empty" description="Nothing here" icon="book-outline" />,
      );

      expect(getByTestId('icon-book-outline')).toBeTruthy();
    });

    test('does not render icon when not provided', () => {
      const { queryByTestId } = render(<EmptyState title="Empty" description="Nothing here" />);

      expect(queryByTestId(/icon-/)).toBeNull();
    });

    test('renders submessage when provided', () => {
      const { getByText } = render(
        <EmptyState title="Empty" description="Nothing here" submessage="Try adding something" />,
      );

      expect(getByText('Try adding something')).toBeTruthy();
    });
  });

  describe('Action Button', () => {
    test('renders default browse articles button', () => {
      const { getByText } = render(<EmptyState title="Empty" description="Nothing here" />);

      expect(getByText('Browse Articles')).toBeTruthy();
    });

    test('navigates to explore tab when browse articles is pressed', () => {
      const { getByText } = render(<EmptyState title="Empty" description="Nothing here" />);

      fireEvent.press(getByText('Browse Articles'));

      expect(mockRouterPush).toHaveBeenCalledWith('/(tabs)/read');
    });

    test('renders actionText button when hideArticlesButton is true', () => {
      const { getByText } = render(
        <EmptyState
          title="Empty"
          description="Nothing here"
          actionText="Add Item"
          onAction={mockOnAction}
          hideArticlesButton
        />,
      );

      expect(getByText('Add Item')).toBeTruthy();
    });

    test('calls onAction when actionText button is pressed', () => {
      const { getByText } = render(
        <EmptyState
          title="Empty"
          description="Nothing here"
          actionText="Add Item"
          onAction={mockOnAction}
          hideArticlesButton
        />,
      );

      fireEvent.press(getByText('Add Item'));

      expect(mockOnAction).toHaveBeenCalledTimes(1);
    });

    test('hides default browse articles button when hideArticlesButton is true', () => {
      const { queryByText } = render(
        <EmptyState title="Empty" description="Nothing here" hideArticlesButton />,
      );

      expect(queryByText('Browse Articles')).toBeNull();
    });
  });

  describe('Custom Action Button', () => {
    test('renders customActionButton when provided', () => {
      const CustomButton = () => {
        const { Text } = require('react-native');
        return <Text>Custom Button</Text>;
      };

      const { getByText } = render(
        <EmptyState
          title="Empty"
          description="Nothing here"
          customActionButton={<CustomButton />}
        />,
      );

      expect(getByText('Custom Button')).toBeTruthy();
    });

    test('customActionButton takes precedence over default button', () => {
      const CustomButton = () => {
        const { Text } = require('react-native');
        return <Text>Custom</Text>;
      };

      const { queryByText, getByText } = render(
        <EmptyState
          title="Empty"
          description="Nothing here"
          customActionButton={<CustomButton />}
        />,
      );

      expect(getByText('Custom')).toBeTruthy();
      expect(queryByText('Browse Articles')).toBeNull();
    });
  });

  describe('Styling', () => {
    test('accepts custom container style', () => {
      const { toJSON } = render(
        <EmptyState
          title="Empty"
          description="Nothing here"
          containerStyle={{ backgroundColor: 'red' }}
        />,
      );

      expect(toJSON()).toBeTruthy();
    });

    test('accepts custom icon size', () => {
      const { toJSON } = render(
        <EmptyState title="Empty" description="Nothing here" icon="star" iconSize={48} />,
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    test('handles empty description', () => {
      const { getByText } = render(<EmptyState title="Title Only" description="" />);

      expect(getByText('Title Only')).toBeTruthy();
    });

    test('handles long title and description', () => {
      const longTitle = 'This is a very long title that might wrap to multiple lines';
      const longDesc =
        'This is a very long description that explains in detail what the empty state means and what actions the user can take to change it.';

      const { getByText } = render(<EmptyState title={longTitle} description={longDesc} />);

      expect(getByText(longTitle)).toBeTruthy();
      expect(getByText(longDesc)).toBeTruthy();
    });
  });
});
