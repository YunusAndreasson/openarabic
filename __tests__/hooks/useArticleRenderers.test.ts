import { renderHook, act } from '@testing-library/react-hooks';
import { useArticleRenderers } from '../../hooks/useArticleRenderers';

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

// Mock types
type MockSentenceWord = {
  id: number;
  word_form: string;
  english: string;
  position: number;
  sentence_id: number;
  difficulty_level: number;
  root_id: number;
  word_type_id: number;
  grammar_note: string | null;
};

describe('useArticleRenderers', () => {
  // Test data
  const mockSettings = { fontScale: 1.2 };
  const mockColors = { text: '#000000', background: '#FFFFFF' };
  const mockSelectedWordIds = new Set<number>([1, 3, 5]);

  const mockWords: MockSentenceWord[] = [
    {
      id: 1,
      word_form: 'كتاب',
      english: 'book',
      position: 1,
      sentence_id: 100,
      difficulty_level: 2,
      root_id: 10,
      word_type_id: 1,
      grammar_note: null,
    },
    {
      id: 2,
      word_form: 'جميل',
      english: 'beautiful',
      position: 2,
      sentence_id: 100,
      difficulty_level: 1,
      root_id: 20,
      word_type_id: 2,
      grammar_note: 'adjective',
    },
  ];

  const mockSentenceWordsMap = new Map<number, MockSentenceWord[]>([
    [100, mockWords],
    [101, []],
  ]);

  const mockHandleWordPress = jest.fn();

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the expected API surface', () => {
    const { result } = renderHook(() =>
      useArticleRenderers(
        mockSettings,
        mockColors,
        mockSelectedWordIds,
        mockSentenceWordsMap as any,
        mockHandleWordPress as any
      )
    );

    // Check the hook returns the expected properties
    expect(result.current).toHaveProperty('prepareWord');
    expect(result.current).toHaveProperty('enhanceWord');
    expect(result.current).toHaveProperty('handleArticlePress');
    expect(result.current).toHaveProperty('getWordsForSentence');

    // Check the types of the returned functions
    expect(typeof result.current.prepareWord).toBe('function');
    expect(typeof result.current.enhanceWord).toBe('function');
    expect(typeof result.current.handleArticlePress).toBe('function');
    expect(typeof result.current.getWordsForSentence).toBe('function');
  });

  it('enhanceWord adds required properties to word objects', () => {
    const { result } = renderHook(() =>
      useArticleRenderers(
        mockSettings,
        mockColors,
        mockSelectedWordIds,
        mockSentenceWordsMap as any,
        mockHandleWordPress as any
      )
    );

    const enhancedWord = result.current.enhanceWord(mockWords[0] as any);

    // Check the enhanced word has the original properties
    expect(enhancedWord).toHaveProperty('id', mockWords[0].id);
    expect(enhancedWord).toHaveProperty('word_form', mockWords[0].word_form);
    expect(enhancedWord).toHaveProperty('english', mockWords[0].english);

    // Check the enhanced word has the new properties
    expect(enhancedWord).toHaveProperty('root', null);
    expect(enhancedWord).toHaveProperty('word_type', null);
  });

  it('prepareWord correctly prepares a word for rendering', () => {
    const { result } = renderHook(() =>
      useArticleRenderers(
        mockSettings,
        mockColors,
        mockSelectedWordIds,
        mockSentenceWordsMap as any,
        mockHandleWordPress as any
      )
    );

    // Test with a selected word
    const selectedWordProps = result.current.prepareWord(mockWords[0] as any);
    expect(selectedWordProps).toEqual({
      word: expect.objectContaining({
        id: mockWords[0].id,
        word_form: mockWords[0].word_form,
        root: null,
        word_type: null,
      }),
      isSelected: true,
      key: mockWords[0].id,
      onPress: mockHandleWordPress,
      scale: mockSettings.fontScale,
      baseSize: 24,
    });

    // Test with a non-selected word
    const nonSelectedWordProps = result.current.prepareWord(mockWords[1] as any);
    expect(nonSelectedWordProps).toEqual({
      word: expect.objectContaining({
        id: mockWords[1].id,
        word_form: mockWords[1].word_form,
        root: null,
        word_type: null,
      }),
      isSelected: false,
      key: mockWords[1].id,
      onPress: mockHandleWordPress,
      scale: mockSettings.fontScale,
      baseSize: 24,
    });
  });

  it('handleArticlePress navigates to the correct article', () => {
    const { result } = renderHook(() =>
      useArticleRenderers(
        mockSettings,
        mockColors,
        mockSelectedWordIds,
        mockSentenceWordsMap as any,
        mockHandleWordPress as any
      )
    );

    // Call the handleArticlePress function
    act(() => {
      result.current.handleArticlePress(123);
    });

    // Check that router.push was called with the correct parameters
    expect(require('expo-router').router.push).toHaveBeenCalledWith({
      pathname: '/article/[id]',
      params: { id: 123 },
    });
  });

  it('getWordsForSentence returns the correct words for a sentence', () => {
    const { result } = renderHook(() =>
      useArticleRenderers(
        mockSettings,
        mockColors,
        mockSelectedWordIds,
        mockSentenceWordsMap as any,
        mockHandleWordPress as any
      )
    );

    // Test with a sentence that has words
    const wordsForSentence100 = result.current.getWordsForSentence(100);
    expect(wordsForSentence100).toEqual(mockWords);

    // Test with a sentence that has no words
    const wordsForSentence101 = result.current.getWordsForSentence(101);
    expect(wordsForSentence101).toEqual([]);

    // Test with a sentence that doesn't exist in the map
    const wordsForSentence102 = result.current.getWordsForSentence(102);
    expect(wordsForSentence102).toEqual([]);
  });

  it('memoizes functions correctly', () => {
    // First render
    const { result, rerender } = renderHook(
      props =>
        useArticleRenderers(
          props.settings,
          props.colors,
          props.selectedWordIds,
          props.sentenceWordsMap as any,
          props.handleWordPress as any
        ),
      {
        initialProps: {
          settings: mockSettings,
          colors: mockColors,
          selectedWordIds: mockSelectedWordIds,
          sentenceWordsMap: mockSentenceWordsMap,
          handleWordPress: mockHandleWordPress,
        },
      }
    );

    // Store references to the initial functions
    const initialPrepareWord = result.current.prepareWord;
    const initialHandleArticlePress = result.current.handleArticlePress;

    // Rerender with the same props
    rerender({
      settings: mockSettings,
      colors: mockColors,
      selectedWordIds: mockSelectedWordIds,
      sentenceWordsMap: mockSentenceWordsMap,
      handleWordPress: mockHandleWordPress,
    });

    // Functions should be the same instances (memoized)
    expect(result.current.prepareWord).toBe(initialPrepareWord);
    expect(result.current.handleArticlePress).toBe(initialHandleArticlePress);

    // Rerender with different settings
    const newSettings = { fontScale: 1.5 };
    rerender({
      settings: newSettings,
      colors: mockColors,
      selectedWordIds: mockSelectedWordIds,
      sentenceWordsMap: mockSentenceWordsMap,
      handleWordPress: mockHandleWordPress,
    });

    // prepareWord should be a new instance because settings changed
    // but handleArticlePress should still be the same
    expect(result.current.prepareWord).not.toBe(initialPrepareWord);
    expect(result.current.handleArticlePress).toBe(initialHandleArticlePress);
  });
});
