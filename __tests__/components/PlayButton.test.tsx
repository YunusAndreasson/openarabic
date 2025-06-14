import React from 'react';
import { ActivityIndicator } from 'react-native';
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

import PlayButton from '../../components/listen/PlayButton';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: any) => <props.name {...props} />,
}));

const mockSelectionFeedback = jest.fn();
jest.mock('../../utils/haptics', () => ({
  selectionFeedback: () => mockSelectionFeedback(),
}));

jest.mock('../../hooks/animations', () => ({
  usePressAnimation: () => ({
    animatedStyle: {},
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  }),
}));

jest.mock('../../hooks/theme/useColors', () => ({
  useColors: () => ({ tint: '#000', text: '#fff' }),
}));

describe('PlayButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pause icon when playing', () => {
    const { getByProps } = render(<PlayButton onPress={jest.fn()} isPlaying />);
    expect(getByProps({ name: 'pause' })).toBeTruthy();
  });

  it('renders loading indicator when loading', () => {
    const { UNSAFE_getByType } = render(<PlayButton onPress={jest.fn()} isLoading />);
    expect(UNSAFE_getByType(ActivityIndicator)).toBeTruthy();
  });

  it('is disabled when disabled prop is true', () => {
    const { getByRole } = render(<PlayButton onPress={jest.fn()} disabled />);
    expect(getByRole('button').props.disabled).toBe(true);
  });

  it('triggers haptic feedback and callback on press', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<PlayButton onPress={onPress} />);
    fireEvent.press(getByRole('button'));

    expect(mockSelectionFeedback).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
