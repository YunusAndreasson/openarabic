import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/ThemedView';
import {
  DictionaryEmptyState,
  DictionaryWordCard,
  MemoryStrengthLegend,
  WordSentencesBottomSheet,
} from '@/components/practice';
import { LIST_DRAW_DISTANCE_MULTIPLIER, TIMING_CONFIG, TIMING_CONSTANTS } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useDictionaryModal, useFSRSQueries } from '@/hooks/vocabulary';
import type { RootId } from '@/types/branded.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

export default function DictionaryScreen(): JSX.Element {
  const { user } = useAuth();
  const { editMode, reset } = useEditMode('dictionary');
  const insets = useSafeAreaInsets();
  const { preconfigureAudioSession } = useSimpleAudioPlayer();

  // State for sentence examples bottom sheet
  const [selectedWord, setSelectedWord] = useState<StudyWord | null>(null);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);

  // Preconfigure audio session on mount for instant audio playback
  useEffect(() => {
    preconfigureAudioSession().catch(() => {
      // Silent fail - audio will try to configure on first play
    });
  }, [preconfigureAudioSession]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (editMode) {
          reset();
        }
      };
    }, [editMode, reset]),
  );

  // Get all study words for dictionary display (shows all words, sorted by memory strength)
  const { allWords: studyWords, isLoading } = useFSRSQueries({ userId: user?.id });

  // No refetch callback needed - mutation's onSuccess handles invalidation
  const { toggleRootMutation } = useStudyWordMutations();

  const { sortedWords, sortDirection, setSorting } = useDictionaryModal({
    studyWords: studyWords || [],
  });

  const hasWords = sortedWords.length > 0;

  const contentContainerStyle = useMemo(
    () => ({
      paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE,
      ...(!hasWords ? { flexGrow: 1 } : {}),
    }),
    [hasWords, insets.bottom],
  );

  // Handle opening the sentence examples bottom sheet
  const handleWordPress = useCallback((word: StudyWord) => {
    setSelectedWord(word);
    setIsBottomSheetVisible(true);
  }, []);

  // Handle closing the sentence examples bottom sheet
  const handleCloseBottomSheet = useCallback(() => {
    setIsBottomSheetVisible(false);
    // Delay clearing selected word to allow close animation
    setTimeout(() => setSelectedWord(null), TIMING_CONSTANTS.MEDIUM_DELAY);
  }, []);

  const handleDeleteWord = useCallback(
    async (rootId: RootId) => {
      if (!user?.id) return;
      try {
        await toggleRootMutation.mutateAsync({ userId: user.id, rootId });
      } catch (error) {
        await handleError(error instanceof Error ? error : String(error), {
          showToast: true,
          toastMessage: STRINGS.FAILED_TO_DELETE_WORD,
          captureSentry: !__DEV__,
        });
      }
    },
    [user?.id, toggleRootMutation],
  );

  const renderItem = useCallback(
    (props: { item: StudyWord }) => (
      <Animated.View
        entering={FadeIn.duration(TIMING_CONFIG.MEDIUM.duration)}
        exiting={FadeOut.duration(TIMING_CONFIG.FAST.duration)}
      >
        <DictionaryWordCard
          word={props.item}
          editMode={editMode}
          onDelete={() => handleDeleteWord(props.item.root_id)}
          onPress={handleWordPress}
        />
      </Animated.View>
    ),
    [editMode, handleDeleteWord, handleWordPress],
  );

  const ListEmptyComponent = useMemo(
    () => (hasWords ? null : <DictionaryEmptyState />),
    [hasWords],
  );

  return (
    <ThemedView style={styles.container}>
      {isLoading ? null : (
        <View style={styles.contentContainer}>
          <FlashList
            data={sortedWords}
            renderItem={renderItem}
            ListHeaderComponent={
              hasWords ? (
                <MemoryStrengthLegend sortDirection={sortDirection} onToggleSort={setSorting} />
              ) : null
            }
            ListEmptyComponent={ListEmptyComponent}
            contentContainerStyle={contentContainerStyle}
            showsVerticalScrollIndicator={true}
            removeClippedSubviews={true}
            drawDistance={LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM * LIST_DRAW_DISTANCE_MULTIPLIER}
            // v2 performance optimizations
            maxItemsInRecyclePool={40} // Control memory usage for vocabulary lists
            maintainVisibleContentPosition={{}} // Prevent scroll jumps when words are deleted (enabled by default)
            // v2 automatically handles layout - no estimates needed
            // Note: No extraData needed - DictionaryWordCard is properly memoized and receives editMode as prop
          />
        </View>
      )}

      {/* Sentence examples bottom sheet - uses RN Modal for guaranteed z-index */}
      <WordSentencesBottomSheet
        isVisible={isBottomSheetVisible}
        onClose={handleCloseBottomSheet}
        word={selectedWord}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  contentContainer: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    flex: 1,
  },
});
