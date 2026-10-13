import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { act, render } from '@testing-library/react-native';
import * as Reanimated from 'react-native-reanimated';

import { rootId } from '@/__tests__/helpers/ids';
import { MemoryHorizonBand } from '@/components/practice/charts/MemoryHorizonBand';
import { commitFeedback, selectionFeedback } from '@/utils/haptics';
import { BIN_COUNT, getHorizonBinIndex } from '@/utils/horizonBandPath';

interface Reaction {
  prepare: () => number | boolean;
  react: (current: number | boolean, previous: number | boolean | null) => void;
}

const mockReactions: Reaction[] = [];
const mockPendingFeedback: (() => void)[] = [];
const mockIsFocused = jest.fn(() => true);

jest.mock('expo-router', () => ({
  useIsFocused: () => true,
  useNavigation: () => ({ isFocused: mockIsFocused }),
}));

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (callback: (...args: unknown[]) => void, ...args: unknown[]) => {
    mockPendingFeedback.push(() => callback(...args));
  },
}));

jest.mock('@/utils/haptics', () => ({
  commitFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
}));

function field(days: number | null) {
  const horizonByRootId = new Map(
    days === null ? [] : [1, 2, 3].map(id => [rootId(id), days] as const),
  );
  const bins = new Array<number>(BIN_COUNT).fill(0);
  if (days !== null) bins[getHorizonBinIndex(days)] = horizonByRootId.size;
  return {
    bins,
    horizonByRootId,
    wordsPerDot: 1,
    medianFraction: 0,
    hasDistribution: horizonByRootId.size > 0,
  };
}

function queueBeat(kind: 'landing' | 'travel commit' | 'redraw commit') {
  const view = render(<MemoryHorizonBand {...field(kind === 'redraw commit' ? null : 1)} />);
  view.rerender(<MemoryHorizonBand {...field(30)} />);

  // Drive an animation frame, then leave the RN callback queued to reproduce
  // navigation covering Practice between the landing and its feedback.
  const reaction = mockReactions.at(kind === 'redraw commit' ? -1 : -2);
  if (!reaction) throw new Error('expected a constellation animation reaction');
  act(() => {
    if (kind === 'redraw commit') reaction.react(true, false);
    else if (kind === 'landing') reaction.react(1, 0);
    else reaction.react(reaction.prepare(), 0);
  });
  expect(mockPendingFeedback).toHaveLength(1);
}

beforeEach(() => {
  jest.clearAllMocks();
  mockReactions.length = 0;
  mockPendingFeedback.length = 0;
  mockIsFocused.mockReturnValue(true);
  jest.spyOn(Reanimated, 'useAnimatedReaction').mockImplementation((prepare, react) => {
    mockReactions.push({ prepare, react } as Reaction);
  });
});

describe('constellation feedback focus', () => {
  test.each(['landing', 'travel commit', 'redraw commit'] as const)(
    '%s stays silent if Practice is covered before feedback executes',
    kind => {
      queueBeat(kind);
      mockIsFocused.mockReturnValue(false);
      act(() => mockPendingFeedback.forEach(callback => callback()));

      expect(selectionFeedback).not.toHaveBeenCalled();
      expect(commitFeedback).not.toHaveBeenCalled();
    },
  );

  test.each(['landing', 'travel commit', 'redraw commit'] as const)(
    '%s still provides feedback while Practice is focused',
    kind => {
      queueBeat(kind);
      act(() => mockPendingFeedback.forEach(callback => callback()));

      expect(kind === 'landing' ? selectionFeedback : commitFeedback).toHaveBeenCalledTimes(1);
      expect(kind === 'landing' ? commitFeedback : selectionFeedback).not.toHaveBeenCalled();
    },
  );
});
