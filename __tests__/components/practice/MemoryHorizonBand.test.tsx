/**
 * The memory constellation moves its dots when a session changes the field, and
 * that is all it does. It used to tick a haptic for every landing dot and close
 * on a commit beat — feedback on a stats screen for no decision the learner
 * made, right after a session whose every card had already been felt. These
 * tests hold that the travel, the regrow and the plain re-render stay silent.
 */
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { render } from '@testing-library/react-native';

import { rootId } from '@/__tests__/helpers/ids';
import { MemoryHorizonBand } from '@/components/practice/charts/MemoryHorizonBand';
import { commitFeedback, lightFeedback, selectionFeedback, successFeedback } from '@/utils/haptics';
import { BIN_COUNT, getHorizonBinIndex } from '@/utils/horizonBandPath';

jest.mock('@/utils/haptics', () => ({
  commitFeedback: jest.fn(),
  lightFeedback: jest.fn(),
  selectionFeedback: jest.fn(),
  successFeedback: jest.fn(),
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

const expectSilence = () => {
  expect(commitFeedback).not.toHaveBeenCalled();
  expect(lightFeedback).not.toHaveBeenCalled();
  expect(selectionFeedback).not.toHaveBeenCalled();
  expect(successFeedback).not.toHaveBeenCalled();
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('constellation stays silent', () => {
  test('dots travelling to new horizons fire no haptics', () => {
    const view = render(<MemoryHorizonBand {...field(1)} />);
    view.rerender(<MemoryHorizonBand {...field(30)} />);

    expectSilence();
  });

  test('a field regrown out of an empty axis fires no haptics', () => {
    const view = render(<MemoryHorizonBand {...field(null)} />);
    view.rerender(<MemoryHorizonBand {...field(30)} />);

    expectSilence();
  });
});
