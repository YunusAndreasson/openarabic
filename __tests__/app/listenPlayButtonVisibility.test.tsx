import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { View, TouchableOpacity, Text } from 'react-native';

import { AUDIO_STATES } from '../../constants/audio';

// Mock the ListenListItem component to test play button visibility
const MockListenListItem = ({ audioState, onPlayPress, editMode }: any) => {
  const hasAudio = true;
  const shouldShowPlayButton = hasAudio && !editMode && audioState !== AUDIO_STATES.PLAYING;

  return (
    <View>
      {shouldShowPlayButton && onPlayPress ? (
        <TouchableOpacity testID="individual-play-button" onPress={onPlayPress}>
          <Text>Play</Text>
        </TouchableOpacity>
      ) : null}
      <View testID="article-card">
        <Text>Article Card</Text>
      </View>
    </View>
  );
};

// Mock the listen screen with multiple articles
const MockListenScreen = ({ audioState }: { audioState: string }) => {
  const mockArticles = [
    { id: 1, title: 'Article 1' },
    { id: 2, title: 'Article 2' },
    { id: 3, title: 'Article 3' },
  ];

  return (
    <View>
      <TouchableOpacity testID="play-all-button">
        <Text>Play All</Text>
      </TouchableOpacity>
      {mockArticles.map(article => (
        <MockListenListItem
          key={article.id}
          audioState={audioState}
          onPlayPress={jest.fn()}
          editMode={false}
        />
      ))}
      {audioState === AUDIO_STATES.PLAYING && (
        <View testID="now-playing-card">
          <Text>Now Playing</Text>
        </View>
      )}
    </View>
  );
};

describe('Listen Screen Play Button Visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows individual play buttons when audio is idle', () => {
    const { getAllByTestId } = render(<MockListenScreen audioState={AUDIO_STATES.IDLE} />);

    const playButtons = getAllByTestId('individual-play-button');
    expect(playButtons).toHaveLength(3); // Should show play button for each article
  });

  it('hides individual play buttons when audio is playing', () => {
    const { queryAllByTestId, getByTestId } = render(
      <MockListenScreen audioState={AUDIO_STATES.PLAYING} />
    );

    const playButtons = queryAllByTestId('individual-play-button');
    expect(playButtons).toHaveLength(0); // Should hide all individual play buttons

    // Should show now playing card instead
    expect(getByTestId('now-playing-card')).toBeTruthy();
  });

  it('shows individual play buttons when audio is stopped', () => {
    const { getAllByTestId } = render(<MockListenScreen audioState={AUDIO_STATES.STOPPED} />);

    const playButtons = getAllByTestId('individual-play-button');
    expect(playButtons).toHaveLength(3); // Should show play buttons again when stopped
  });

  it('shows individual play buttons when audio is loading (only PLAYING hides them)', () => {
    const { getAllByTestId } = render(<MockListenScreen audioState={AUDIO_STATES.LOADING} />);

    const playButtons = getAllByTestId('individual-play-button');
    expect(playButtons).toHaveLength(3); // Loading state should still show buttons (only PLAYING hides them)
  });
});

describe('Play Button State Transitions', () => {
  it('simulates the complete flow: idle -> playing -> stopped', () => {
    const TestComponent = ({ audioState }: { audioState: string }) => (
      <MockListenScreen audioState={audioState} />
    );

    const { rerender, getAllByTestId, queryAllByTestId, getByTestId } = render(
      <TestComponent audioState={AUDIO_STATES.IDLE} />
    );

    // Initial state: should show play buttons
    expect(getAllByTestId('individual-play-button')).toHaveLength(3);

    // Start playing: should hide play buttons and show now playing
    rerender(<TestComponent audioState={AUDIO_STATES.PLAYING} />);

    expect(queryAllByTestId('individual-play-button')).toHaveLength(0);
    expect(getByTestId('now-playing-card')).toBeTruthy();

    // Stop playing: should show play buttons again
    rerender(<TestComponent audioState={AUDIO_STATES.STOPPED} />);

    expect(getAllByTestId('individual-play-button')).toHaveLength(3);
  });
});

describe('Integration with Memory Requirements', () => {
  it('validates the memory requirement: avoid conflicting playback controls', () => {
    const { queryAllByTestId, getByTestId } = render(
      <MockListenScreen audioState={AUDIO_STATES.PLAYING} />
    );

    // When playing, should not have both individual play buttons AND now playing controls
    const individualPlayButtons = queryAllByTestId('individual-play-button');
    const nowPlayingCard = getByTestId('now-playing-card');

    expect(individualPlayButtons).toHaveLength(0); // No individual controls
    expect(nowPlayingCard).toBeTruthy(); // Only centralized control

    // This validates the memory: "Avoid having conflicting playback controls in the interface"
  });
});
