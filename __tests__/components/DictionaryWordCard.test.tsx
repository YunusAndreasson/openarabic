import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { DictionaryWordCard } from '../../components/practice/DictionaryWordCard';
import type { StudyWord } from '../../types/vocabulary.types';

// Mock dependencies
jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    error: '#f00',
    warning: '#ff0',
    success: '#0f0',
    elevation1: '#fff',
    white: '#fff',
    secondaryText: '#666',
    text: '#000',
    tint: '#0f0',
    primary: '#00f',
    textTertiary: '#666',
    card: '#fff',
    borderOverlay: '#ccc',
    navigationRipple: '#ccc',
  }),
}));

jest.mock('@/utils/haptics', () => ({
  selectionFeedback: jest.fn(),
}));

jest.mock('@/utils/imageUtils', () => ({
  generateAudioUrl: jest.fn(),
}));

jest.mock('@/hooks/audio/useSimpleAudioPlayer', () => ({
  useSimpleAudioPlayer: () => ({
    play: jest.fn().mockResolvedValue(true),
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    currentTrack: null,
  }),
}));

// Mock BaseCard
jest.mock('@common/BaseCard', () => {
  const React = require('react');
  const { TouchableOpacity } = require('react-native');
  return {
    default: ({ children, onPress, ...props }: any) =>
      React.createElement(TouchableOpacity, { onPress, testID: 'base-card', ...props }, children),
  };
});

// Mock ThemedText
jest.mock('@/components/ThemedText', () => ({
  ThemedText: ({ children, ...props }: any) => {
    const React = require('react');
    const { Text } = require('react-native');
    return React.createElement(Text, props, children);
  },
}));

// Mock DifficultyBar
jest.mock('@/components/practice/DifficultyBar', () => ({
  DifficultyBar: () => {
    const React = require('react');
    const { View } = require('react-native');
    return React.createElement(View, { testID: 'difficulty-bar' });
  },
}));

describe('DictionaryWordCard', () => {
  const createStudyWord = (overrides: Partial<StudyWord> = {}): StudyWord => ({
    root_id: 1,
    user_id: 'user-1',
    fsrs_due: new Date().toISOString(),
    fsrs_stability: 1.0,
    fsrs_difficulty: 5.0,
    fsrs_elapsed_days: 0,
    fsrs_scheduled_days: 1,
    fsrs_learning_steps: 0,
    fsrs_reps: 1,
    fsrs_lapses: 0,
    fsrs_state: 2,
    fsrs_last_review: new Date().toISOString(),
    created_at: new Date().toISOString(),
    root: {
      id: 1,
      letters: 'قِلَّةٌ',
      meaning: 'lack',
      audio_url: 'arabic-audio.mp3',
      audio_url_en: 'english-audio.mp3',
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Audio Playback', () => {
    it('calls generateAudioUrl for Arabic audio when word is tapped', () => {
      const mockGenerateAudioUrl = require('@/utils/imageUtils').generateAudioUrl;
      const mockAudioPlayer = require('@/hooks/audio/useSimpleAudioPlayer').useSimpleAudioPlayer();
      const mockSelectionFeedback = require('@/utils/haptics').selectionFeedback;

      mockGenerateAudioUrl
        .mockReturnValueOnce('https://example.com/audio/arabic-audio.mp3') // Arabic audio
        .mockReturnValueOnce(undefined); // English audio (fallback)

      const word = createStudyWord();
      const { getByTestId } = render(
        <DictionaryWordCard word={word} editMode={false} onDelete={jest.fn()} />
      );

      const card = getByTestId('base-card');
      fireEvent.press(card);

      // Should call generateAudioUrl for Arabic audio first
      expect(mockGenerateAudioUrl).toHaveBeenCalledWith('arabic-audio.mp3');
      // Should call generateAudioUrl for English audio as fallback
      expect(mockGenerateAudioUrl).toHaveBeenCalledWith('english-audio.mp3');
      // Should trigger haptic feedback
      expect(mockSelectionFeedback).toHaveBeenCalled();
      // Should play the Arabic audio
      expect(mockAudioPlayer.play).toHaveBeenCalledWith({
        id: 'word-1-ar',
        audioUrl: 'https://example.com/audio/arabic-audio.mp3',
        title: 'قِلَّةٌ',
      });
    });

    it('falls back to English audio when Arabic audio is not available', () => {
      const mockGenerateAudioUrl = require('@/utils/imageUtils').generateAudioUrl;
      const mockAudioPlayer = require('@/hooks/audio/useSimpleAudioPlayer').useSimpleAudioPlayer();

      mockGenerateAudioUrl
        .mockReturnValueOnce(undefined) // Arabic audio not available
        .mockReturnValueOnce('https://example.com/audio/english-audio.mp3'); // English audio available

      const word = createStudyWord({
        root: {
          id: 1,
          letters: 'قِلَّةٌ',
          meaning: 'lack',
          audio_url: null, // No Arabic audio
          audio_url_en: 'english-audio.mp3',
        },
      });

      const { getByTestId } = render(
        <DictionaryWordCard word={word} editMode={false} onDelete={jest.fn()} />
      );

      const card = getByTestId('base-card');
      fireEvent.press(card);

      // Should call generateAudioUrl for both audio types
      expect(mockGenerateAudioUrl).toHaveBeenCalledWith(null);
      expect(mockGenerateAudioUrl).toHaveBeenCalledWith('english-audio.mp3');
      // Should play the English audio
      expect(mockAudioPlayer.play).toHaveBeenCalledWith({
        id: 'word-1-en',
        audioUrl: 'https://example.com/audio/english-audio.mp3',
        title: 'قِلَّةٌ',
      });
    });

    it('does not play audio when no audio URLs are available', () => {
      const mockGenerateAudioUrl = require('@/utils/imageUtils').generateAudioUrl;
      const mockAudioPlayer = require('@/hooks/audio/useSimpleAudioPlayer').useSimpleAudioPlayer();

      mockGenerateAudioUrl.mockReturnValue(undefined);

      const word = createStudyWord({
        root: {
          id: 1,
          letters: 'قِلَّةٌ',
          meaning: 'lack',
          audio_url: null,
          audio_url_en: null,
        },
      });

      const { getByTestId } = render(
        <DictionaryWordCard word={word} editMode={false} onDelete={jest.fn()} />
      );

      const card = getByTestId('base-card');
      fireEvent.press(card);

      // Should not play any audio
      expect(mockAudioPlayer.play).not.toHaveBeenCalled();
    });

    it('does not play audio when in edit mode', () => {
      const mockAudioPlayer = require('@/hooks/audio/useSimpleAudioPlayer').useSimpleAudioPlayer();

      const word = createStudyWord();
      const { getByTestId } = render(
        <DictionaryWordCard word={word} editMode={true} onDelete={jest.fn()} />
      );

      const card = getByTestId('base-card');
      fireEvent.press(card);

      // Should not play any audio in edit mode
      expect(mockAudioPlayer.play).not.toHaveBeenCalled();
    });
  });

  describe('UI Rendering', () => {
    it('renders Arabic and English text correctly', () => {
      const word = createStudyWord();
      const { getByText } = render(
        <DictionaryWordCard word={word} editMode={false} onDelete={jest.fn()} />
      );

      expect(getByText('قِلَّةٌ')).toBeTruthy();
      expect(getByText('lack')).toBeTruthy();
    });
  });
});
