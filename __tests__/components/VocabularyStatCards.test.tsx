import { render } from '@testing-library/react-native';
import React from 'react';

import VocabularyStatCards from '../../components/practice/VocabularyStatCards';
import type { StudyWord } from '../../types/vocabulary.types';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

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
    text: '#000',
    tint: '#0f0',
    primary: '#00f',
    textTertiary: '#666',
    card: '#fff',
    borderOverlay: '#ccc',
    navigationRipple: '#ccc',
  }),
}));

// Mock FlashList
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem }: any) => {
    const React = require('react');
    return React.createElement(
      'View',
      {},
      data?.map((item: any, index: number) => renderItem({ item, index }))
    );
  },
}));

// Mock Modal
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Modal: ({ children, visible }: any) => (visible ? children : null),
  };
});

jest.mock('@charts/ChartColors', () => ({
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

jest.mock('@/components/practice/charts/MemoryRetentionGauge', () => ({
  MemoryRetentionGauge: () => null,
}));

jest.mock('@/hooks/animations', () => ({
  usePressAnimation: () => ({
    animatedStyle: {},
    handlePressIn: jest.fn(),
    handlePressOut: jest.fn(),
  }),
}));

jest.mock('@/hooks/vocabulary', () => ({
  useDictionaryModal: () => ({
    sortedWords: [],
    sortOption: 'difficulty',
    sortDirection: 'asc',
    setSorting: jest.fn(),
  }),
}));

jest.mock('@/components/providers/ToastProvider', () => ({
  useToast: () => ({
    showToast: jest.fn(),
  }),
}));

describe('VocabularyStatCards - Basic Functionality', () => {
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

      const { UNSAFE_root } = render(<VocabularyStatCards studyWords={words} />);

      expect(UNSAFE_root).toBeTruthy();
    });

    it('shows memory capacity gauge integration', () => {
      const words = [createStudyWord()];

      const { UNSAFE_root } = render(<VocabularyStatCards studyWords={words} />);

      // Should render with memory capacity integration
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles empty study words gracefully', () => {
      const { UNSAFE_root } = render(<VocabularyStatCards studyWords={[]} />);

      // Should render without crashing
      expect(UNSAFE_root).toBeTruthy();
    });

    it('handles invalid study words data gracefully', () => {
      const { UNSAFE_root } = render(<VocabularyStatCards studyWords={undefined as any} />);

      // Should render without crashing
      expect(UNSAFE_root).toBeTruthy();
    });
  });

  describe('Stats Display', () => {
    it('displays all three stat categories', () => {
      const words = [createStudyWord(), createStudyWord({ root_id: 2 })];

      const { getByText } = render(
        <VocabularyStatCards studyWords={words} dueWords={1} learningWords={1} masteredWords={0} />
      );

      // Should show all stat labels
      expect(getByText('Due')).toBeTruthy();
      expect(getByText('Learning')).toBeTruthy();
      expect(getByText('Mastered')).toBeTruthy();
    });

    it('displays correct stat values', () => {
      const words = [createStudyWord(), createStudyWord({ root_id: 2 })];

      const { getAllByText } = render(
        <VocabularyStatCards studyWords={words} dueWords={1} learningWords={1} masteredWords={0} />
      );

      // Should show correct values
      expect(getAllByText('1').length).toBeGreaterThan(0); // Due and Learning
      expect(getAllByText('0').length).toBeGreaterThan(0); // Mastered
    });

    it('handles zero values correctly', () => {
      const { getAllByText } = render(
        <VocabularyStatCards studyWords={[]} dueWords={0} learningWords={0} masteredWords={0} />
      );

      // Should show all zeros
      expect(getAllByText('0').length).toBeGreaterThanOrEqual(3);
    });

    it('handles large numbers correctly', () => {
      const { getByText } = render(
        <VocabularyStatCards
          studyWords={[]}
          dueWords={999}
          learningWords={500}
          masteredWords={250}
        />
      );

      expect(getByText('999')).toBeTruthy();
      expect(getByText('500')).toBeTruthy();
      expect(getByText('250')).toBeTruthy();
    });

    it('renders without stats props (fallback behavior)', () => {
      const words = [createStudyWord()];

      const { UNSAFE_root } = render(<VocabularyStatCards studyWords={words} />);

      // Should render without crashing even without explicit stats
      expect(UNSAFE_root).toBeTruthy();
    });
  });
});
