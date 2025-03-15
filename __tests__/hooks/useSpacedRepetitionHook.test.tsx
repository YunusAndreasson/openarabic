// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock services/studyWords directly
jest.mock('../../services/studyWords', () => ({
  studyWordsService: {
    updateWordReview: jest.fn(() => Promise.resolve({})),
    getDueWords: jest.fn(() =>
      Promise.resolve([
        {
          sentence_word_id: '1',
          sentence_word: {
            word_form: 'كتاب',
            english: 'book',
            sentence: {
              arabic: 'هذا كتاب جميل',
            },
          },
          interval_days: 1,
          ease_factor: 2.5,
          next_review_at: new Date().toISOString(),
          review_count: 0,
          lapses: 0,
          stability: 1,
          previous_interval: 0,
        },
        {
          sentence_word_id: '2',
          sentence_word: {
            word_form: 'قلم',
            english: 'pen',
            sentence: {
              arabic: 'هذا قلم أزرق',
            },
          },
          interval_days: 2,
          ease_factor: 2.3,
          next_review_at: new Date().toISOString(),
          review_count: 1,
          lapses: 0,
          stability: 2,
          previous_interval: 1,
        },
      ])
    ),
  },
}));

// Simple test to verify the hook exports
describe('useSpacedRepetition Hook', () => {
  it('should export the expected functions', () => {
    const {
      calculateNextReview,
      shouldRequeueWord,
      calculateReinsertPosition,
      calculateProgress,
      isReviewComplete,
      getSrsStatsFromWords,
    } = require('../../hooks/useSpacedRepetition');

    expect(calculateNextReview).toBeDefined();
    expect(shouldRequeueWord).toBeDefined();
    expect(calculateReinsertPosition).toBeDefined();
    expect(calculateProgress).toBeDefined();
    expect(isReviewComplete).toBeDefined();
    expect(getSrsStatsFromWords).toBeDefined();
  });
});
