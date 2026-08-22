import { describe, expect, jest, test } from '@jest/globals';
import { render, waitFor } from '@testing-library/react-native';

import { ROUTE_PATHS } from '@/constants/routes';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), dismiss: jest.fn() },
  useLocalSearchParams: () => ({}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('@/components/primitives/ThemedText', () => {
  const { Text } = require('react-native');
  return {
    ThemedText: ({ children }: { children?: import('react').ReactNode }) => <Text>{children}</Text>,
  };
});

jest.mock('@/components/ui', () => {
  const { View } = require('react-native');
  return { PulsatingLoader: () => <View testID="review-loader" /> };
});

jest.mock('@/components/review', () => {
  const { View } = require('react-native');
  return {
    CompletionScreen: ({ testID }: { testID?: string }) => <View testID={testID} />,
    ReviewActionButton: () => null,
    ReviewContextSentence: () => null,
    ReviewFlipCard: () => null,
    ReviewGradeBar: () => null,
    ReviewHeader: () => null,
    VoiceAnswerButton: () => null,
    VoiceListeningIndicator: () => null,
    VoiceResultPanel: () => null,
    voiceButtonMode: () => null,
    voiceIndicatorState: () => null,
  };
});

jest.mock('@/components/tutorials/ReviewGradesTutorial', () => ({
  ReviewGradesTutorial: () => null,
}));

jest.mock('@/components/providers', () => ({
  useTutorialContext: () => ({
    isLoaded: true,
    shouldShowTutorial: () => false,
  }),
  useVoiceGrading: () => ({
    setPlaybackPriority: jest.fn(),
    isMicStreamOpen: () => false,
  }),
}));

jest.mock('@/hooks/tutorials/useTutorial', () => ({
  useTutorial: () => ({ dismiss: jest.fn(), isVisible: false, trigger: jest.fn() }),
}));

jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({ background: '#000', secondaryText: '#888', success: '#0f0' }),
}));

jest.mock('@/store/hooks', () => ({
  useAppSelectorShallow: () => false,
}));

const mockEmptyMetrics = {
  wordsReviewed: 0,
  wordsKnown: 0,
  wordsUnknown: 0,
  averageStabilityIncrease: 0,
  longestStreak: 0,
  currentStreak: 0,
  masteredWords: 0,
  firstAttemptKnown: 0,
  firstAttemptUnknown: 0,
  startTime: 0,
};

jest.mock('@/hooks/review', () => ({
  useReview: () => ({
    currentSentence: { wordForm: '' },
    currentMeaning: '',
    currentWord: null,
    revealed: false,
    isComplete: false,
    isEmpty: true,
    isUpdating: false,
    isLoading: false,
    wordQueue: [],
    enrichmentBatches: [],
    progress: 0,
    maxProgress: 0,
    currentWordKey: 'none',
    revealAnswer: jest.fn(),
    grade: jest.fn(),
    intervalLabels: null,
    handleClose: jest.fn(),
    transparentStyle: {},
    sessionMetrics: mockEmptyMetrics,
    handleReplayAudio: jest.fn(),
    playSentenceAudio: jest.fn(),
    restudying: false,
    continueFromRestudy: jest.fn(),
    isAudioPreloading: false,
    audioPreloadProgress: 0,
    isAudioReady: false,
    revealMeaningPassive: jest.fn(),
    stopAudio: jest.fn(),
  }),
  useReviewExamples: () => new Map(),
  useReviewGlossAlternates: () => new Map(),
  useVoiceReview: () => ({
    phase: 'idle',
    debug: null,
    result: null,
    accept: jest.fn(),
    reject: jest.fn(),
    retry: jest.fn(),
    speakNow: jest.fn(),
    stopSpeaking: jest.fn(),
  }),
}));

jest.mock('@/utils/reviewDiagnostics', () => {
  const snapshot = { enabled: false, entries: [] };
  return {
    getDiagSnapshot: () => snapshot,
    setDiagnosticsEnabled: jest.fn(),
    subscribeDiag: () => () => {},
  };
});

import ReviewScreen from '@/app/review';
import { router } from 'expo-router';

const mockReplace = jest.mocked(router.replace);

describe('empty review route', () => {
  test('returns to Practice without rendering completion UI', async () => {
    const { queryByTestId, getByTestId } = render(<ReviewScreen />);

    expect(getByTestId('review-loader')).toBeTruthy();
    expect(queryByTestId('completion-screen')).toBeNull();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(ROUTE_PATHS.PRACTICE_TAB));
  });
});
