import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import ArticleScreen from '@/app/(tabs)/read/article/[id]';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mocks
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: '1' }),
  router: { back: jest.fn() },
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: () => ({
      getQueryData: jest.fn().mockReturnValue([]),
      invalidateQueries: jest.fn(),
      setQueryData: jest.fn(),
    }),
  };
});

jest.mock('@/hooks/auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

jest.mock('@/hooks/theme/useColors', () => ({
  useColors: () => ({
    background: '#fff',
    arabicText: '#000',
    englishText: '#333',
    tint: '#0a0',
    transparent: 'transparent',
    wordDueUnderline: '#f00',
    wordSelectionUnderline: '#0a0',
  }),
}));

// Provide minimal article data and words
jest.mock('@/hooks/articles/useArticleData', () => ({
  useArticleData: () => ({
    article: { id: 1, title: 't', author: { id: 9, name: 'auth' } },
    isLoadingArticle: false,
    selectedWordIds: new Set<number>(),
    sortedSentences: [{ id: 10, english: 'e1', arabic: 'a1', audio_url: null }],
    sentenceWordsMap: new Map<number, any[]>([
      [10, [{ id: 100, position: 0, word_form: 'كلمة', english: 'word', root_id: 5 }]],
    ]),
    refetchStudyWords: jest.fn(),
    isInReadingList: false,
    refetchReadingListStatus: jest.fn(),
  }),
}));

// Mock reading progress hook to avoid react-query undefined in test environment
jest.mock('@/hooks/articles/useReadingProgress', () => ({
  useReadingProgress: () => ({
    lastSentenceRead: 0,
    updateProgress: jest.fn(),
    initialLastSentenceRead: 0,
    hadExistingProgressOnMount: false,
  }),
}));

jest.mock('@/hooks/articles/useArticleRenderers', () => ({
  useArticleRenderers: (
    _opts: any,
    _selectedWordIds: any,
    sentenceWordsMap: Map<number, any[]>,
    _onWordPress: any
  ) => ({
    getWordsForSentence: (sentenceId: number) => {
      const arr = sentenceWordsMap.get(sentenceId) || [];
      return arr.map((w: any) => ({ ...w, testID: `word-${w.id}` }));
    },
  }),
}));

jest.mock('@/hooks/articles/useArticlesByDueWords', () => ({
  useArticlesByDueWords: () => ({ dueWordRootIds: new Set<number>() }),
}));

// Avoid pulling in listen screen / reading list logic
jest.mock('@/hooks/audio/useGlobalAudioState', () => ({
  useGlobalAudioState: () => ({
    isPlaying: false,
    audioState: 'idle',
    currentArticle: null,
    showSleepTimerModal: false,
    shouldHideMiniPlayer: true,
    onSleepTimerClose: jest.fn(),
    onPlayPause: jest.fn(),
    onTimerPress: jest.fn(),
    onExpand: jest.fn(),
    position: 0,
    duration: 0,
  }),
}));

// Mutations: toggle root press should update selectedWordIds set downstream
jest.mock('@/hooks/articles/useArticleMutations', () => ({
  useArticleMutations: () => ({
    handleToggleReadingList: jest.fn(),
    handleRootPress: jest.fn(),
  }),
}));

// Word analysis can be minimal for this test
jest.mock('@/hooks/vocabulary/useArabicWordAnalysis', () => ({
  useArabicWordAnalysis: () => ({ hasComponents: false, coloredSegments: [] }),
}));

// Tooltip layout calc
jest.mock('@/utils/positioningUtils', () => ({
  TOOLTIP_CONSTANTS: { ARROW_SIZE: 6, MIN_PADDING: 12, SCREEN_MARGIN: 16, Z_INDEX: 1000 },
  calculateTooltipDimensions: () => ({
    tooltipLeft: 0,
    tooltipTop: 0,
    tooltipWidth: 120,
    tooltipHeight: 40,
    arrowLeft: 60,
  }),
}));

// Avoid reanimated builder chain in test
// Use global reanimated mock from jest.setup.js

// Provide stable list rendering
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem }: any) => <>{data.map((item: any) => renderItem({ item }))}</>,
}));

// Avoid reanimated usage in PlayButton used by MiniPlayer
jest.mock('@/components/listen/PlayButton', () => () => null);

// Mock react-native-svg used indirectly by ProgressCircle
jest.mock('react-native-svg', () => {
  const View = 'Svg';
  const Circle = 'Circle';
  return { __esModule: true, default: View, Circle };
});

describe('Word bookmark underline flow', () => {
  it('adds and removes underline when toggling study list via bookmark', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { getByTestId, getAllByTestId } = render(
      <QueryClientProvider client={client}>
        <ArticleScreen />
      </QueryClientProvider>
    );

    // Open tooltip by pressing the word
    const word = getByTestId('word-100');
    await act(async () => {
      fireEvent.press(word);
    });

    // Toggle bookmark in tooltip
    // TouchableIcon renders a mock Ionicons text with testID mock-icon-Ionicons in this repo
    const icons = getAllByTestId('mock-icon-Ionicons');
    const icon = Array.isArray(icons) && icons.length > 0 ? icons[icons.length - 1] : icons[0];
    await act(async () => {
      fireEvent.press(icon);
    });

    // Simulate that selectedWordIds now includes the root id (underline should appear)
    // Re-render screen by simulating mutation effect via updating mock to return selected set
    const newUseArticleData = jest.requireMock('@/hooks/articles/useArticleData');
    newUseArticleData.useArticleData = () => ({
      article: { id: 1, title: 't', author: { id: 9, name: 'auth' } },
      isLoadingArticle: false,
      selectedWordIds: new Set<number>([5]),
      sortedSentences: [{ id: 10, english: 'e1', arabic: 'a1', audio_url: null }],
      sentenceWordsMap: new Map<number, any[]>([
        [10, [{ id: 100, position: 0, word_form: 'كلمة', english: 'word', root_id: 5 }]],
      ]),
      refetchStudyWords: jest.fn(),
      isInReadingList: false,
      refetchReadingListStatus: jest.fn(),
    });

    // Re-render to reflect updated selection state
    await act(async () => {
      fireEvent.press(word);
    });

    // Underline is indicated by borderBottomColor change (width is always reserved)
    const updatedWord = getByTestId('word-100');
    const style = (updatedWord.props.style || []).flat?.() || updatedWord.props.style;
    const merged = Array.isArray(style) ? Object.assign({}, ...style.filter(Boolean)) : style;
    expect(merged.borderBottomColor).toBe('#0a0');

    // Now simulate removal from study list (empty set) and re-render
    newUseArticleData.useArticleData = () => ({
      article: { id: 1, title: 't', author: { id: 9, name: 'auth' } },
      isLoadingArticle: false,
      selectedWordIds: new Set<number>(),
      sortedSentences: [{ id: 10, english: 'e1', arabic: 'a1', audio_url: null }],
      sentenceWordsMap: new Map<number, any[]>([
        [10, [{ id: 100, position: 0, word_form: 'كلمة', english: 'word', root_id: 5 }]],
      ]),
      refetchStudyWords: jest.fn(),
      isInReadingList: false,
      refetchReadingListStatus: jest.fn(),
    });

    await act(async () => {
      fireEvent.press(word);
    });

    const updatedWord2 = getByTestId('word-100');
    const style2 = (updatedWord2.props.style || []).flat?.() || updatedWord2.props.style;
    const merged2 = Array.isArray(style2) ? Object.assign({}, ...style2.filter(Boolean)) : style2;
    expect(merged2.borderBottomColor).toBe('transparent');
  });
});
