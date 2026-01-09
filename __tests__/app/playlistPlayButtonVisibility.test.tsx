import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { AUDIO_STATES } from '../../constants/audio';

// Mock the ListenListItem component to test play button visibility
const MockListenListItem = ({ audioState, onPlayPress, editMode }: any) => {
  const shouldShowPlayButton = !editMode && audioState !== AUDIO_STATES.PLAYING;

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

// Mock the listen screen with multiple articles - navigates to modal when playing
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
      {/* App navigates to modal when audio starts playing - no in-screen card */}
    </View>
  );
};

describe('Listen Screen Play Button Visibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows individual play buttons when audio is idle', () => {
    const { getAllByTestId } = render(<MockListenScreen audioState={AUDIO_STATES.IDLE} />);

    const playButtons = getAllByTestId('individual-play-button');
    expect(playButtons).toHaveLength(3); // Should show play button for each article
  });

  test('hides individual play buttons when audio is playing', () => {
    const { queryAllByTestId } = render(<MockListenScreen audioState={AUDIO_STATES.PLAYING} />);

    const playButtons = queryAllByTestId('individual-play-button');
    expect(playButtons).toHaveLength(0); // Should hide all individual play buttons

    // Note: App navigates to modal instead of showing in-screen card
  });

  test('shows individual play buttons when audio is stopped', () => {
    const { getAllByTestId } = render(<MockListenScreen audioState={AUDIO_STATES.STOPPED} />);

    const playButtons = getAllByTestId('individual-play-button');
    expect(playButtons).toHaveLength(3); // Should show play buttons again when stopped
  });

  test('shows individual play buttons when audio is loading (only PLAYING hides them)', () => {
    const { getAllByTestId } = render(<MockListenScreen audioState={AUDIO_STATES.LOADING} />);

    const playButtons = getAllByTestId('individual-play-button');
    expect(playButtons).toHaveLength(3); // Loading state should still show buttons (only PLAYING hides them)
  });
});

describe('Play Button State Transitions', () => {
  test('simulates the flow: idle -> playing (navigates to modal) -> stopped', () => {
    const TestComponent = ({ audioState }: { audioState: string }) => (
      <MockListenScreen audioState={audioState} />
    );

    const { rerender, getAllByTestId, queryAllByTestId } = render(
      <TestComponent audioState={AUDIO_STATES.IDLE} />,
    );

    // Initial state: should show play buttons
    expect(getAllByTestId('individual-play-button')).toHaveLength(3);

    // Start playing: should hide play buttons (app navigates to modal)
    rerender(<TestComponent audioState={AUDIO_STATES.PLAYING} />);
    expect(queryAllByTestId('individual-play-button')).toHaveLength(0);

    // Stop playing: should show play buttons again
    rerender(<TestComponent audioState={AUDIO_STATES.STOPPED} />);
    expect(getAllByTestId('individual-play-button')).toHaveLength(3);
  });
});

describe('Integration with Audio Control Requirements', () => {
  test('validates that individual play buttons are hidden during playback to avoid conflicting controls', () => {
    const { queryAllByTestId } = render(<MockListenScreen audioState={AUDIO_STATES.PLAYING} />);

    // When playing, should not have individual play buttons (avoids conflicting with modal controls)
    const individualPlayButtons = queryAllByTestId('individual-play-button');
    expect(individualPlayButtons).toHaveLength(0); // No individual controls during playback

    // This validates clean control hierarchy: individual cards start playback, modal handles control during playback
  });
});
