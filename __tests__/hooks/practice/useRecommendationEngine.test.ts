import { useRecommendationEngine } from '@/hooks/practice/useRecommendationEngine';
import { renderHook } from '@testing-library/react-native';

describe('useRecommendationEngine', () => {
  describe('vocabulary progression stages', () => {
    it('should recommend adding words for absolute beginner (0 words)', () => {
      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: [],
          dueWordsCount: 0,
          currentRetention: 0,
          learningWords: 0,
          masteredWords: 0,
          trend: 'stable',
        })
      );

      expect(result.current?.type).toBe('add_words');
      expect(result.current?.indicator).toBe('green');
      expect(result.current?.message).toContain('Welcome! Start by adding 10-15 words');
    });

    it('should encourage early learner with 15 words to keep adding', () => {
      const mockWords = Array(15)
        .fill({})
        .map((_, i) => ({
          fsrs_state: i < 10 ? 0 : 2, // 10 learning, 5 mastered
          fsrs_due: new Date().toISOString(),
          fsrs_stability: i < 10 ? 2 : 15,
        }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: mockWords,
          dueWordsCount: 0,
          currentRetention: 85,
          learningWords: 10,
          masteredWords: 5,
          trend: 'stable',
        })
      );

      expect(result.current?.type).toBe('add_words');
      expect(result.current?.indicator).toBe('green');
      expect(result.current?.message).toContain('Great progress! You have a solid start');
    });

    it('should allow adding words for user with 35 words building foundation', () => {
      const mockWords = Array(35)
        .fill({})
        .map((_, i) => ({
          fsrs_state: i < 10 ? 0 : 2, // 10 learning (29%), 25 mastered
          fsrs_due: new Date().toISOString(),
          fsrs_stability: i < 10 ? 3 : 20,
        }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: mockWords,
          dueWordsCount: 0,
          currentRetention: 80,
          learningWords: 10,
          masteredWords: 25,
          trend: 'stable',
        })
      );

      expect(result.current?.type).toBe('add_words');
      expect(result.current?.indicator).toBe('green');
      expect(result.current?.message).toContain('building a strong foundation');
    });

    it('should prioritize review when user has due words', () => {
      const mockWords = Array(30)
        .fill({})
        .map((_, i) => ({
          fsrs_state: i < 20 ? 0 : 2, // 20 learning, 10 mastered
          fsrs_due: new Date().toISOString(),
          fsrs_stability: i < 20 ? 2 : 18,
        }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: mockWords,
          dueWordsCount: 5, // Has due words
          currentRetention: 75,
          learningWords: 20,
          masteredWords: 10,
          trend: 'stable',
        })
      );

      expect(result.current?.type).toBe('review_focus');
      expect(result.current?.indicator).toBe('orange');
      expect(result.current?.message).toContain('waiting for review');
    });

    it('should warn about heavy learning load', () => {
      const mockWords = Array(40)
        .fill({})
        .map((_, i) => ({
          fsrs_state: i < 30 ? 0 : 2, // 30 learning (75%), 10 mastered
          fsrs_due: new Date().toISOString(),
          fsrs_stability: i < 30 ? 2 : 18,
        }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: mockWords,
          dueWordsCount: 0,
          currentRetention: 70,
          learningWords: 30,
          masteredWords: 10,
          trend: 'stable',
        })
      );

      expect(result.current?.type).toBe('review_focus');
      expect(result.current?.indicator).toBe('orange');
      expect(result.current?.message).toContain('many words still learning');
    });

    it('should allow adding words for small vocabularies even with moderate learning load', () => {
      const mockWords = Array(20)
        .fill({})
        .map((_, i) => ({
          fsrs_state: i < 12 ? 0 : 2, // 12 learning (60%), 8 mastered
          fsrs_due: new Date().toISOString(),
          fsrs_stability: i < 12 ? 2 : 18,
        }));

      const { result } = renderHook(() =>
        useRecommendationEngine({
          studyWords: mockWords,
          dueWordsCount: 0,
          currentRetention: 75,
          learningWords: 12,
          masteredWords: 8,
          trend: 'stable',
        })
      );

      // Should allow adding words because vocabulary is small (20 words < 30 threshold)
      expect(result.current?.type).toBe('add_words');
      expect(result.current?.indicator).toBe('green');
    });
  });
});
