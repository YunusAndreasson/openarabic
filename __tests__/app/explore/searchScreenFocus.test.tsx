/**
 * The search field has to open focused.
 *
 * `autoFocus` is Android-only, so on iOS the screen focuses the field itself —
 * but not at mount: the UISearchController does not exist that early, and UIKit
 * swallows a focus issued during the push. It shipped that way once and the
 * field wanted a second tap. The focus is therefore hung off `transitionEnd`,
 * which is what these tests pin: the right event, on the right platform, once.
 */

import { describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';
import { Platform } from 'react-native';

type TransitionEvent = { data: { closing: boolean } };
type TransitionHandler = (event: TransitionEvent) => void;

const mockFocus = jest.fn();
const mockListeners: Record<string, TransitionHandler> = {};
const mockAddListener =
  jest.fn<(event: string, handler: TransitionHandler) => () => void>();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    router: { push: jest.fn() },
    useNavigation: () => ({ addListener: mockAddListener }),
    Stack: {
      // The real one renders null and folds its props into the header options.
      // It exposes its commands through useImperativeHandle, and so must this:
      // assigning ref.current during render is undone at commit, because a
      // component returning null has no instance for React to attach.
      SearchBar: React.forwardRef((_props: unknown, ref: unknown) => {
        React.useImperativeHandle(ref, () => ({ focus: mockFocus, blur: jest.fn() }));
        return null;
      }),
    },
  };
});

jest.mock('@/hooks/articles/useArticleSearch', () => ({
  useArticleSearch: () => ({
    results: [],
    hasQuery: false,
    isBodyLoading: false,
    isBodyError: false,
    retryBody: jest.fn(),
  }),
}));

jest.mock('@/components/explore', () => ({ SearchResultList: () => null }));

import SearchScreen from '@/app/(tabs)/explore/search';

const originalPlatform = Platform.OS;

beforeEach(() => {
  for (const key of Object.keys(mockListeners)) delete mockListeners[key];

  // `resetMocks: true` in jest.config.js strips every jest.fn() implementation
  // before each test, so the listener store has to be re-armed here or
  // addListener silently records the call and keeps nothing.
  mockAddListener.mockImplementation((event, handler) => {
    mockListeners[event] = handler;
    return () => {
      delete mockListeners[event];
    };
  });
});

afterEach(() => {
  Platform.OS = originalPlatform;
});

describe('search screen focus', () => {
  test('iOS waits for the push to finish, then focuses the field', () => {
    Platform.OS = 'ios';
    render(<SearchScreen />);

    expect(mockAddListener).toHaveBeenCalledWith('transitionEnd', expect.any(Function));
    // Nothing focused yet — the screen is still arriving.
    expect(mockFocus).not.toHaveBeenCalled();

    mockListeners.transitionEnd?.({ data: { closing: false } });
    expect(mockFocus).toHaveBeenCalledTimes(1);
  });

  test('a closing transition never focuses', () => {
    Platform.OS = 'ios';
    render(<SearchScreen />);

    mockListeners.transitionEnd?.({ data: { closing: true } });
    expect(mockFocus).not.toHaveBeenCalled();
  });

  test('only the first arrival focuses, so returning from a text stays quiet', () => {
    Platform.OS = 'ios';
    render(<SearchScreen />);

    mockListeners.transitionEnd?.({ data: { closing: false } });
    mockListeners.transitionEnd?.({ data: { closing: false } });

    expect(mockFocus).toHaveBeenCalledTimes(1);
  });

  test('Android registers nothing — its own autoFocus already covers this', () => {
    Platform.OS = 'android';
    render(<SearchScreen />);

    expect(mockAddListener).not.toHaveBeenCalled();
    expect(mockFocus).not.toHaveBeenCalled();
  });
});
