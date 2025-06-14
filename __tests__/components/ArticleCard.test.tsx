import React from 'react';
import { render } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { View, TouchableOpacity, Text } from 'react-native';

import { AUDIO_STATES } from '../../constants/audio';

// Create a simplified test component that mimics the ArticleCard play button logic
const TestArticleCard = ({
  onPlayPress,
  editMode = false,
  audioState = AUDIO_STATES.IDLE,
}: {
  onPlayPress?: () => void;
  editMode?: boolean;
  audioState?: string;
}) => {
  const hasAudio = !!onPlayPress;
  const shouldShowPlayButton = hasAudio && !editMode && audioState !== AUDIO_STATES.PLAYING;

  return (
    <View testID="article-card">
      <Text>Test Article</Text>
      <Text>Test Author</Text>

      {/* Play Button - mimics the logic from ArticleCard */}
      {!editMode && (
        <View testID="play-button-container">
          {shouldShowPlayButton ? (
            <TouchableOpacity testID="play-button" onPress={onPlayPress}>
              <Text>Play</Text>
            </TouchableOpacity>
          ) : (
            <View testID="play-button-placeholder" />
          )}
        </View>
      )}
    </View>
  );
};

describe('ArticleCard Play Button Visibility Logic', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Visibility Rules', () => {
    it('shows play button when audio is available and not in edit mode', () => {
      const { getByTestId } = render(<TestArticleCard onPlayPress={jest.fn()} editMode={false} />);

      expect(getByTestId('play-button')).toBeTruthy();
    });

    it('hides play button when in edit mode', () => {
      const { queryByTestId } = render(<TestArticleCard onPlayPress={jest.fn()} editMode={true} />);

      expect(queryByTestId('play-button')).toBeNull();
    });

    it('hides play button when no onPlayPress is provided (no audio)', () => {
      const { queryByTestId } = render(<TestArticleCard editMode={false} />);

      expect(queryByTestId('play-button')).toBeNull();
    });
  });

  describe('Audio State Integration', () => {
    it('shows play button when audio is idle', () => {
      const { getByTestId } = render(
        <TestArticleCard onPlayPress={jest.fn()} editMode={false} audioState={AUDIO_STATES.IDLE} />
      );

      expect(getByTestId('play-button')).toBeTruthy();
    });

    it('hides play button when audio is playing (key behavior)', () => {
      const { queryByTestId } = render(
        <TestArticleCard
          onPlayPress={jest.fn()}
          editMode={false}
          audioState={AUDIO_STATES.PLAYING}
        />
      );

      expect(queryByTestId('play-button')).toBeNull();
    });

    it('shows play button when audio is stopped', () => {
      const { getByTestId } = render(
        <TestArticleCard
          onPlayPress={jest.fn()}
          editMode={false}
          audioState={AUDIO_STATES.STOPPED}
        />
      );

      expect(getByTestId('play-button')).toBeTruthy();
    });

    it('shows play button when audio is loading', () => {
      const { getByTestId } = render(
        <TestArticleCard
          onPlayPress={jest.fn()}
          editMode={false}
          audioState={AUDIO_STATES.LOADING}
        />
      );

      expect(getByTestId('play-button')).toBeTruthy();
    });
  });

  describe('Logic Validation', () => {
    const cases: Array<[boolean, boolean, string, boolean]> = [
      // hasAudio, editMode, audioState, expectedVisible
      [true, false, AUDIO_STATES.IDLE, true],
      [true, false, AUDIO_STATES.LOADING, true],
      [true, false, AUDIO_STATES.PLAYING, false],
      [true, false, AUDIO_STATES.STOPPED, true],
      [true, false, AUDIO_STATES.ERROR, true],
      [true, true, AUDIO_STATES.IDLE, false],
      [false, false, AUDIO_STATES.IDLE, false],
    ];

    test.each(cases)('hasAudio=%s editMode=%s state=%s → visible=%s', (hasAudio, editMode, audioState, expectedVisible) => {
      const { queryByTestId } = render(
        <TestArticleCard
          onPlayPress={hasAudio ? jest.fn() : undefined}
          editMode={editMode}
          audioState={audioState}
        />
      );

      const playButton = queryByTestId('play-button');
      if (expectedVisible) {
        expect(playButton).toBeTruthy();
      } else {
        expect(playButton).toBeNull();
      }
    });
  });
});
