import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ListSeparator, LoadingState } from '@/components/common';
import { DictionaryEmptyState, DictionarySortBar, DictionaryWordRow } from '@/components/practice';
import { LIST_DRAW_DISTANCE_MULTIPLIER, TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { getPracticeWordRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useDictionaryList, useFSRSQueries, useResetWordProgress } from '@/hooks/vocabulary';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

// Row mount fade — Reanimated 4 CSS @keyframes. Unlike entering/exiting layout
// animations, a CSS animation doesn't re-fire when FlashList recycles the row
// onto a new item, so fast scrolls stay clean.
//
// Every row fades on the same clock: a per-row stagger across a dozen dense
// hairline rows reads as a cascade of lines rather than a list appearing.
const ROW_FADE_IN_STYLE = {
  animationName: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  animationDuration: `${TIMING_CONFIG.MEDIUM.duration}ms`,
  animationFillMode: 'backwards' as const,
} as ReanimatedCSSAnimationStyle;

export default function DictionaryScreen(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { preconfigureAudioSession } = useSimpleAudioPlayer();

  // Preconfigure audio session on mount for instant audio playback
  useEffect(() => {
    preconfigureAudioSession().catch(() => {
      // Silent fail - audio will try to configure on first play
    });
  }, [preconfigureAudioSession]);

  const { allWords: studyWords, isLoading } = useFSRSQueries({ userId: user?.id });

  // No refetch callback needed - mutation's onSuccess handles invalidation
  const { toggleRootMutation } = useStudyWordMutations();
  const toggleRoot = toggleRootMutation.mutateAsync;
  const { confirmReset } = useResetWordProgress();

  const {
    words,
    totalCount,
    sortField,
    sortDirection,
    selectSortField,
    searchQuery,
    setSearchQuery,
  } = useDictionaryList({ studyWords: studyWords || [] });

  const listRef = useRef<FlashListRef<StudyWord>>(null);

  // Re-sorting mid-list would otherwise leave you stranded somewhere in the
  // middle (maintainVisibleContentPosition anchors by key), with no sign that
  // anything happened. Jump to the top so the new order is what you see.
  const handleSelectField = useCallback(
    (field: Parameters<typeof selectSortField>[0]) => {
      selectSortField(field);
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
    },
    [selectSortField],
  );

  const hasWords = words.length > 0;

  const contentContainerStyle = useMemo(
    () => ({
      paddingBottom: insets.bottom + LAYOUT.SPACING.XLARGE,
      ...(!hasWords ? { flexGrow: 1 } : {}),
    }),
    [hasWords, insets.bottom],
  );

  const handleWordPress = useCallback(
    (word: StudyWord) => {
      router.push(getPracticeWordRoute(word.root_id));
    },
    [router],
  );

  // Stable identity per word so recycling, deletions, and sort flips keep
  // rows anchored (maintainVisibleContentPosition anchors by key).
  const keyExtractor = useCallback((word: StudyWord) => String(word.root_id), []);

  const handleRemoveWord = useCallback(
    async (word: StudyWord) => {
      if (!user?.id) return;
      try {
        // Explicit intent: a delete must never flip into a re-add when the
        // cached study list is stale
        await toggleRoot({
          userId: user.id,
          rootId: word.root_id,
          intent: 'remove',
        });
      } catch (error) {
        await handleError(error, {
          showToast: true,
          toastMessage: STRINGS.FAILED_TO_DELETE_WORD,
          captureSentry: !__DEV__,
        });
      }
    },
    [user, toggleRoot],
  );

  const handleResetProgress = useCallback(
    (word: StudyWord) => {
      confirmReset(word.root_id);
    },
    [confirmReset],
  );

  const renderItem = useCallback(
    (props: { item: StudyWord }) => (
      <Animated.View style={ROW_FADE_IN_STYLE}>
        <DictionaryWordRow
          word={props.item}
          onPress={handleWordPress}
          onRemove={handleRemoveWord}
          onResetProgress={handleResetProgress}
        />
      </Animated.View>
    ),
    [handleWordPress, handleRemoveWord, handleResetProgress],
  );

  // A hairline rule, not a gap: the rows are flat, so the line is what
  // separates them.
  const renderSeparator = useCallback(
    () => <ListSeparator height={StyleSheet.hairlineWidth} color={colors.border} />,
    [colors.border],
  );

  const ListEmptyComponent = useMemo(() => {
    if (hasWords) return null;
    // A fruitless search gets a quiet notice; a truly empty dictionary gets
    // the full call-to-action empty state.
    if (searchQuery.trim()) {
      return (
        <View style={styles.searchEmptyContainer}>
          <ThemedText type="body" colorName="secondaryText" align="center">
            {STRINGS.NO_WORDS_MATCH_SEARCH}
          </ThemedText>
        </View>
      );
    }
    return <DictionaryEmptyState />;
  }, [hasWords, searchQuery]);

  return (
    <ThemedView style={styles.container}>
      {/* Native header search bar (UISearchController on iOS, SearchView on
          Android). Declarative in SDK 57 — it renders null and folds its props
          into the parent Stack's header options, so it replaces the old
          useLayoutEffect + navigation.setOptions round-trip. */}
      <Stack.SearchBar
        placeholder={STRINGS.SEARCH_WORDS}
        hideWhenScrolling={false}
        autoCapitalize="none"
        onChangeText={event => setSearchQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setSearchQuery('')}
        onClose={() => setSearchQuery('')}
        // Android SearchView colors (iOS adapts to the theme on its own)
        headerIconColor={colors.text}
        textColor={colors.text}
        hintTextColor={colors.textTertiary}
      />
      {isLoading ? (
        <LoadingState />
      ) : (
        <View style={styles.contentContainer}>
          {/* Pinned, not a ListHeaderComponent: how the list is sorted is system
              status and has to stay visible. As a scrolling header it left the
              screen on the first flick — more so now the rows are half as tall —
              and took the only way to change the sort with it. */}
          {totalCount > 0 && (
            <DictionarySortBar
              sortField={sortField}
              sortDirection={sortDirection}
              onSelectField={handleSelectField}
              wordCount={words.length}
            />
          )}
          <FlashList
            ref={listRef}
            data={words}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListEmptyComponent={ListEmptyComponent}
            ItemSeparatorComponent={renderSeparator}
            contentContainerStyle={contentContainerStyle}
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            drawDistance={LAYOUT.CARD.HEIGHT.VOCABULARY_ITEM * LIST_DRAW_DISTANCE_MULTIPLIER}
            // v2 performance optimizations
            maxItemsInRecyclePool={40} // Control memory usage for vocabulary lists
            maintainVisibleContentPosition={{}} // Prevent scroll jumps when words are deleted (enabled by default)
            // v2 automatically handles layout - no estimates needed
          />
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: LAYOUT.COMMON_STYLES.CONTAINER,
  contentContainer: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    flex: 1,
  },
  searchEmptyContainer: {
    paddingTop: LAYOUT.SPACING.XXLARGE,
  },
});
