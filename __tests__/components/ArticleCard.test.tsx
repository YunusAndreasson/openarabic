import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ArticleCard } from '../../components/home/ArticleCard';
import { AUDIO_STATES } from '../../constants/audio';
import { useColors } from '../../hooks/theme/useColors';

// Mock the theme hook
jest.mock('../../hooks/theme/useColors');
const mockUseColors = useColors as jest.MockedFunction<typeof useColors>;

// Mock FlashList
jest.mock('@shopify/flash-list', () => ({
  FlashList: 'FlashList',
}));

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

describe('ArticleCard', () => {
  const mockColors = {
    background: '#ffffff',
    text: '#000000',
    secondaryText: '#666666',
    border: '#e0e0e0',
    tint: '#007AFF',
    elevation1: '#f8f8f8',
    elevation2: '#f0f0f0',
    elevation3: '#e8e8e8',
    shadow: '#000000',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
    black: '#000000',
    white: '#ffffff',
  };

  beforeEach(() => {
    mockUseColors.mockReturnValue(mockColors);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const defaultProps = {
    title: 'Test Article Title',
    author: 'Test Author',
  };

  it('renders with title and author', () => {
    render(<ArticleCard {...defaultProps} />);

    expect(screen.getByText('Test Article Title')).toBeTruthy();
    expect(screen.getByText('Test Author')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    render(<ArticleCard {...defaultProps} onPress={onPress} />);

    const card = screen.getByText('Test Article Title');
    card.props.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows play button when onPlayPress is provided and not in edit mode', () => {
    const onPlayPress = jest.fn();
    render(<ArticleCard {...defaultProps} onPlayPress={onPlayPress} />);

    // The play button should be visible
    expect(screen.getByTestId('play-button')).toBeTruthy();
  });

  it('hides play button when onPlayPress is not provided', () => {
    render(<ArticleCard {...defaultProps} />);

    // The play button should not be visible
    expect(screen.queryByTestId('play-button')).toBeNull();
  });

  it('hides play button when in edit mode', () => {
    const onPlayPress = jest.fn();
    render(<ArticleCard {...defaultProps} onPlayPress={onPlayPress} editMode={true} />);

    // The play button should not be visible in edit mode
    expect(screen.queryByTestId('play-button')).toBeNull();
  });

  it('calls onPlayPress when play button is pressed', () => {
    const onPlayPress = jest.fn();
    render(<ArticleCard {...defaultProps} onPlayPress={onPlayPress} />);

    const playButton = screen.getByTestId('play-button');
    playButton.props.onPress();

    expect(onPlayPress).toHaveBeenCalledTimes(1);
  });

  it('shows delete button when in edit mode', () => {
    render(<ArticleCard {...defaultProps} editMode={true} onDelete={jest.fn()} />);

    expect(screen.getByTestId('delete-button')).toBeTruthy();
  });

  it('calls onDelete when delete button is pressed', () => {
    const onDelete = jest.fn();
    render(<ArticleCard {...defaultProps} editMode={true} onDelete={onDelete} />);

    const deleteButton = screen.getByTestId('delete-button');
    deleteButton.props.onPress();

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('renders with image when imageUrl is provided', () => {
    const imageUrl = 'https://example.com/image.jpg';
    render(<ArticleCard {...defaultProps} imageUrl={imageUrl} />);

    // The image should be rendered
    expect(screen.getByTestId('article-image')).toBeTruthy();
  });

  // Test the actual usage pattern from ListenScreen
  describe('audio state integration', () => {
    it('provides onPress and onPlayPress when audio is idle', () => {
      const onPlayPress = jest.fn();
      const audioState = AUDIO_STATES.IDLE;

      // Simulate the logic from ListenScreen - check if not playing
      const isPlaying = audioState === AUDIO_STATES.PLAYING;
      const shouldEnablePlayback = !isPlaying;

      render(
        <ArticleCard
          {...defaultProps}
          onPress={shouldEnablePlayback ? onPlayPress : undefined}
          onPlayPress={shouldEnablePlayback ? onPlayPress : undefined}
        />
      );

      expect(screen.getByTestId('play-button')).toBeTruthy();
    });

    it('disables onPress and onPlayPress when audio is playing', () => {
      const onPlayPress = jest.fn();
      const audioState = AUDIO_STATES.PLAYING;

      // Simulate the logic from ListenScreen - check if not playing
      const isPlaying = audioState === AUDIO_STATES.PLAYING;
      const shouldEnablePlayback = !isPlaying;

      render(
        <ArticleCard
          {...defaultProps}
          onPress={shouldEnablePlayback ? onPlayPress : undefined}
          onPlayPress={shouldEnablePlayback ? onPlayPress : undefined}
        />
      );

      expect(screen.queryByTestId('play-button')).toBeNull();
    });

    it('enables onPress and onPlayPress when audio is loading', () => {
      const onPlayPress = jest.fn();
      const audioState = AUDIO_STATES.LOADING;

      // Simulate the logic from ListenScreen - check if not playing
      const isPlaying = audioState === AUDIO_STATES.PLAYING;
      const shouldEnablePlayback = !isPlaying;

      render(
        <ArticleCard
          {...defaultProps}
          onPress={shouldEnablePlayback ? onPlayPress : undefined}
          onPlayPress={shouldEnablePlayback ? onPlayPress : undefined}
        />
      );

      expect(screen.getByTestId('play-button')).toBeTruthy();
    });
  });
});
