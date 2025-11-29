import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import type { JSX } from 'react';
import { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { DictionaryWordCard, MemoryStrengthLegend } from '@/components/study';
import { LIST_DRAW_DISTANCE_MULTIPLIER } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEditMode } from '@/hooks/ui/useEditMode';
import { useDictionaryModal, useFSRSQueries } from '@/hooks/vocabulary';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

export default function DictionaryScreen(): JSX.Element {
  const { user } = useAuth();
  const { editMode, reset } = useEditMode('dictionary');
  const insets = useSafeAreaInsets();
  const { preconfigureAudioSession } = useSimpleAudioPlayer();

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

  const handleDeleteWord = useCallback(
    async (rootId: number) => {
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
      <DictionaryWordCard
        word={props.item}
        editMode={editMode}
        onDelete={() => handleDeleteWord(props.item.root_id)}
      />
    ),
    [editMode, handleDeleteWord],
  );

  return (
    <ThemedView style={styles.container}>
      {isLoading ? null : hasWords ? (
        <View style={styles.contentContainer}>
          <FlashList
            data={sortedWords}
            renderItem={renderItem}
            ListHeaderComponent={
              <MemoryStrengthLegend sortDirection={sortDirection} onToggleSort={setSorting} />
            }
            contentContainerStyle={{ paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            drawDistance={LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM * LIST_DRAW_DISTANCE_MULTIPLIER}
            // v2 performance optimizations
            maxItemsInRecyclePool={40} // Control memory usage for vocabulary lists
            maintainVisibleContentPosition={{}} // Prevent scroll jumps when words are deleted (enabled by default)
            // v2 automatically handles layout - no estimates needed
            // Note: No extraData needed - DictionaryWordCard is properly memoized and receives editMode as prop
          />
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <ThemedText type="body" variant="secondary" align="center">
            {STRINGS.STUDY_LIST_EMPTY_HINT}
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
  },
  contentContainer: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    flex: 1,
  },
});
