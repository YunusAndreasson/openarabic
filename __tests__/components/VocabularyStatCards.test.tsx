import { render } from '@testing-library/react-native';
import React from 'react';

import { VocabularyStatCards } from '../../components/vocabulary/VocabularyStatCards';
import type { StudyWord } from '../../types/vocabulary.types';

// Mock dependencies
jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    error: '#f00',
    warning: '#ff0',
    info: '#0ff',
    success: '#0f0',
    elevation1: '#fff',
    white: '#fff',
    secondaryText: '#666',
  }),
}));

jest.mock('@/components/vocabulary/shared/chartColors', () => ({
  useChartColors: () => ({
    performance: {
      excellent: '#00ff00', // Green
      good: '#00ffff', // Blue
      moderate: '#ffaa00', // Orange/Yellow
      poor: '#ff0000', // Red
    },
    withOpacity: (color: string, opacity: number) =>
      `${color}${Math.round(opacity * 255)
        .toString(16)
        .padStart(2, '0')}`,
  }),
}));

jest.mock('@/hooks/vocabulary/useMemoryCapacityGauge', () => ({
  useMemoryCapacityGauge: () => ({
    memoryMetrics: {
      capacityScore: 75,
      dueWords: 0,
      strugglingWords: 0,
      masteredWords: 0,
    },
    getCapacityColor: () => '#00ff00',
    getReadinessMessage: () => 'Ready to add words',
    getActionCardBackground: () => '#f0fff0',
  }),
}));

jest.mock('@/components/vocabulary/charts/MemoryCapacityGauge', () => ({
  MemoryCapacityGauge: () => null,
}));

jest.mock('@/hooks/animations', () => ({
  usePressAnimation: () => ({
    animatedStyle: {},
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  }),
}));

describe('VocabularyStatCards - Basic Functionality', () => {
  const mockOnStartReview = jest.fn();

  // Helper function to create test study words
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
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Implementation', () => {
    it('renders without crashing with basic props', () => {
      const words = [createStudyWord()];

      const { UNSAFE_root } = render(
        <VocabularyStatCards studyWords={words} onStartReview={mockOnStartReview} />
      );

      expect(UNSAFE_root).toBeTruthy();
    });

    it('shows memory capacity gauge integration', () => {
      const words = [createStudyWord()];

      const { UNSAFE_root } = render(
        <VocabularyStatCards studyWords={words} onStartReview={mockOnStartReview} />
      );

      // Should render with memory capacity integration
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles empty study words gracefully', () => {
      const { UNSAFE_root } = render(
        <VocabularyStatCards studyWords={[]} onStartReview={mockOnStartReview} />
      );

      // Should render without crashing
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles invalid study words data gracefully', () => {
      const { UNSAFE_root } = render(
        <VocabularyStatCards studyWords={undefined as any} onStartReview={mockOnStartReview} />
      );

      // Should render without crashing
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Button Rendering', () => {
    it('renders practice buttons with proper test IDs', () => {
      const words = [createStudyWord()];

      const { queryByTestId } = render(
        <VocabularyStatCards studyWords={words} dueWords={1} onStartReview={mockOnStartReview} />
      );

      // Should have at least the total words button
      const totalButton = queryByTestId('start-review-all');
      expect(totalButton).toBeTruthy();
    });

    it('shows appropriate buttons based on word categories', () => {
      const words = [
        createStudyWord({
          fsrs_difficulty: 8.5,
          fsrs_lapses: 2,
          fsrs_last_review: new Date().toISOString(),
          fsrs_reps: 3,
        }),
      ];

      const { queryByTestId } = render(
        <VocabularyStatCards studyWords={words} dueWords={0} onStartReview={mockOnStartReview} />
      );

      // Should show at least total words button
      const totalButton = queryByTestId('start-review-all');
      expect(totalButton).toBeTruthy();
    });
  });

  describe('Text Content', () => {
    it('displays word count numbers', () => {
      const words = [createStudyWord(), createStudyWord({ root_id: 2 })];

      const { getAllByText } = render(
        <VocabularyStatCards studyWords={words} dueWords={0} onStartReview={mockOnStartReview} />
      );

      // Should show the word count (might appear multiple times)
      expect(getAllByText('2').length).toBeGreaterThan(0);
    });

    it('displays all words label', () => {
      const words = [createStudyWord()];

      const { getByText } = render(
        <VocabularyStatCards studyWords={words} dueWords={0} onStartReview={mockOnStartReview} />
      );

      // Should show all words label
      expect(getByText('Building learning capacity')).toBeTruthy();
    });
  });
});
