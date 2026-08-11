import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { ListSeparator, LoadingState } from '@/components/common';
import {
  DictionaryEmptyState,
  DictionarySortBar,
  DictionaryWordRow,
  SCOPE_LABELS,
  formatWordCount,
} from '@/components/practice';
import { SettingsPicker, TextLink } from '@/components/ui';
import type { SettingsPickerOption } from '@/components/ui/SettingsPicker';
import { LIST_DRAW_DISTANCE_MULTIPLIER, TIMING_CONFIG } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { getPracticeWordRoute } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useSimpleAudioPlayer } from '@/hooks/audio/useSimpleAudioPlayer';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { useDictionaryList, useFSRSQueries, useResetWordProgress } from '@/hooks/vocabulary';
import type { DictionaryScope } from '@/hooks/vocabulary/useDictionaryList';
import type { ReanimatedCSSAnimationStyle } from '@/types/ui/base.types';
import type { StudyWord } from '@/types/vocabulary.types';
import { handleError } from '@/utils/errorHandling';

/** What an empty scope says. `all` is unreachable here — it has its own CTA state. */
const SCOPE_EMPTY_MESSAGES: Record<Exclude<DictionaryScope, 'all'>, string> = {
  due: STRINGS.SCOPE_EMPTY_DUE,
  struggling: STRINGS.SCOPE_EMPTY_STRUGGLING,
  mastered: STRINGS.SCOPE_EMPTY_MASTERED,
};

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
    scope,
    setScope,
    scopeCounts,
  } = useDictionaryList({ studyWords: studyWords || [] });

  const [isScopePickerVisible, setScopePickerVisible] = useState(false);

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

  const scopeOptions = useMemo<SettingsPickerOption<DictionaryScope>[]>(
    () => [
      {
        id: 'all',
        title: SCOPE_LABELS.all,
        subtitle: formatWordCount(scopeCounts.all),
        icon: 'book-outline',
      },
      {
        id: 'due',
        title: SCOPE_LABELS.due,
        subtitle: formatWordCount(scopeCounts.due),
        icon: 'time-outline',
      },
      {
        id: 'struggling',
        title: SCOPE_LABELS.struggling,
        subtitle: formatWordCount(scopeCounts.struggling),
        icon: 'alert-circle-outline',
      },
      {
        id: 'mastered',
        title: SCOPE_LABELS.mastered,
        subtitle: formatWordCount(scopeCounts.mastered),
        icon: 'checkmark-circle-outline',
      },
    ],
    // Counts sit in the subtitles so an empty scope is visible BEFORE you pick
    // it — otherwise choosing "Struggling" on a good week costs two taps to
    // land on an empty list and back out again.
    [scopeCounts],
  );

  const handleOpenScopePicker = useCallback(() => setScopePickerVisible(true), []);
  const handleCloseScopePicker = useCallback(() => setScopePickerVisible(false), []);

  const handleSelectScope = useCallback(
    (nextScope: DictionaryScope) => {
      setScope(nextScope);
      setScopePickerVisible(false);
      // Same reason changing the sort scrolls to the top: the list you are
      // looking at is no longer the list you were looking at.
      listRef.current?.scrollToOffset({ offset: 0, animated: false });
    },
    [setScope],
  );

  const handleShowAllWords = useCallback(() => handleSelectScope('all'), [handleSelectScope]);

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

  // One instant for every row's age meter, read once per screen. A clock read
  // inside each row would give two words measured a millisecond apart different
  // fractions and defeat the row's memo comparison on every pass; a bare
  // `Date.now()` in render is an impure call the React Compiler rejects. Same
  // lazy-initialiser pattern as useSessionMetrics and useReview.
  const [nowMs] = useState(() => Date.now());

  const renderItem = useCallback(
    (props: { item: StudyWord }) => (
      <Animated.View style={ROW_FADE_IN_STYLE}>
        <DictionaryWordRow
          word={props.item}
          sortField={sortField}
          nowMs={nowMs}
          onPress={handleWordPress}
          onRemove={handleRemoveWord}
          onResetProgress={handleResetProgress}
        />
      </Animated.View>
    ),
    [sortField, nowMs, handleWordPress, handleRemoveWord, handleResetProgress],
  );

  // A hairline rule, not a gap: the rows are flat, so the line is what
  // separates them.
  const renderSeparator = useCallback(
    () => <ListSeparator height={StyleSheet.hairlineWidth} color={colors.border} />,
    [colors.border],
  );

  /**
   * The sort bar rides INSIDE the list, not pinned above it.
   *
   * It was pinned deliberately — how the list is sorted is system status, and as
   * a scrolling header it leaves the screen on the first flick, taking the only
   * way to change the sort with it. But this is the one screen in the app with a
   * `Stack.SearchBar`, and on iOS that becomes a UISearchController living in the
   * navigation bar. In that configuration UIKit lays the screen's content out
   * from the top of the window, UNDER the bars, and expects the scroll view to
   * compensate — which is what `contentInsetAdjustmentBehavior="automatic"` below
   * does. That inset reaches the scroll view and nothing else, so a pinned
   * sibling renders behind the search bar and is invisible on iOS while the rows
   * beneath it land correctly. Android lays its toolbar out above the content, so
   * it never showed the bug.
   *
   * FlashList v2's `stickyHeaderIndices` maps over `data` and renders through
   * `renderItem`, so it cannot stick a ListHeaderComponent — keeping the bar
   * pinned would mean injecting a sentinel row into `data`, which also disables
   * `ListEmptyComponent` (the list would never be empty). Not worth it for a
   * layout bug; re-pinning wants a proper header-height offset instead.
   */
  const ListHeaderComponent = useMemo(
    () =>
      totalCount > 0 ? (
        <DictionarySortBar
          scope={scope}
          sortField={sortField}
          sortDirection={sortDirection}
          onPressScope={handleOpenScopePicker}
          onSelectField={handleSelectField}
          wordCount={words.length}
        />
      ) : null,
    [
      totalCount,
      scope,
      sortField,
      sortDirection,
      handleOpenScopePicker,
      handleSelectField,
      words.length,
    ],
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
    // An empty scope is usually good news, so it says what it found rather than
    // "no results" — and it carries the way back, because the learner narrowed
    // the list from a control that is now off screen above the fold.
    if (scope !== 'all') {
      return (
        <View style={styles.searchEmptyContainer}>
          <ThemedText type="body" colorName="secondaryText" align="center">
            {SCOPE_EMPTY_MESSAGES[scope]}
          </ThemedText>
          <TextLink
            label={STRINGS.SHOW_ALL_WORDS}
            style={styles.scopeEscape}
            onPress={handleShowAllWords}
          />
        </View>
      );
    }
    return <DictionaryEmptyState />;
  }, [hasWords, searchQuery, scope, handleShowAllWords]);

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
          <FlashList
            ref={listRef}
            data={words}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={ListHeaderComponent}
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

      {/* Inline <BottomSheet> (what SettingsPicker uses), and rendered inside
          this screen rather than at the root: this route is itself a modal, and
          a root-level overlay draws behind a modal screen. */}
      <SettingsPicker
        isVisible={isScopePickerVisible}
        options={scopeOptions}
        selectedValue={scope}
        title={STRINGS.SCOPE_PICKER_TITLE}
        onClose={handleCloseScopePicker}
        onSelect={handleSelectScope}
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
  searchEmptyContainer: {
    paddingTop: LAYOUT.SPACING.XXLARGE,
    alignItems: 'center',
  },
  scopeEscape: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
});
