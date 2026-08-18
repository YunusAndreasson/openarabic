/**
 * LoadingState Tests
 *
 * The rule under test is an accessibility one, and it is easy to regress by
 * accident: PulsatingLoader announces itself by default, so a LoadingState that
 * ALSO renders a message would give a screen reader two focus stops — "Loading…"
 * followed by the more specific text — where the second says everything the
 * first does. The loader must go silent exactly when there is text beside it.
 */
import { render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { LoadingState } from '@/components/common/LoadingState';

jest.mock('@/components/primitives/ThemedText', () => {
  const { Text } = require('react-native');
  const ReactLocal = require('react');
  return {
    ThemedText: ({ children }: { children: React.ReactNode }) =>
      ReactLocal.createElement(Text, null, children),
  };
});

// Stands in for the loader so the prop it is GIVEN is observable. Rendering the
// real one needs the theme + reanimated stack and would tell us nothing extra.
jest.mock('@/components/ui/PulsatingLoader', () => {
  const { Text } = require('react-native');
  const ReactLocal = require('react');
  return {
    PulsatingLoader: ({ accessibilityLabel }: { accessibilityLabel?: string | null }) =>
      ReactLocal.createElement(
        Text,
        { testID: 'loader-a11y' },
        accessibilityLabel === null ? 'silent' : 'announces',
      ),
  };
});

describe('LoadingState', () => {
  test('silences the loader when a message already describes the wait', () => {
    const { getByTestId, getByText } = render(<LoadingState message="Loading articles…" />);

    expect(getByTestId('loader-a11y')).toHaveTextContent('silent');
    expect(getByText('Loading articles…')).toBeTruthy();
  });

  test('lets the loader announce itself when nothing else does', () => {
    const { getByTestId } = render(<LoadingState />);

    expect(getByTestId('loader-a11y')).toHaveTextContent('announces');
  });
});
