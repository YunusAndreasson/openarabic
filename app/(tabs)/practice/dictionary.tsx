import { FlashList } from '@shopify/flash-list';
import { useNavigation, useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { LoadingState } from '@/components/common';
import {
  DictionaryEmptyState,
  DictionarySortBar,
  DictionaryWordCard,
} from '@/components/practice';
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
import type { NativeStackNavigationOptions } from '@/utils/navigation';

// Row mount fade — Reanimated 4 CSS @keyframes. Unlike entering/exiting layout
// animations, a CSS animation doesn't re-fire when FlashList recycles the row
// onto a new item, so fast scrolls stay clean while first paint keeps the
// staggered fade (per-row animationDelay below).
const ROW_FADE_IN_STYLE = {
  animationName: {
    from: { opacity: 0 },
    to: { opacity: 1 },
  },
  animationDuration: `${TIMING_CONFIG.MEDIUM.duration}ms`,
  // 'backwards' holds opacity 0 through the stagger delay, then settles at the
  // natural style (opacity 1) once finished
  animationFillMode: 'backwards' as const,
} as ReanimatedCSSAnimationStyle;

export default function DictionaryScreen(): JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
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

  // Native header search bar (UISearchController on iOS, SearchView on Android)
  useLayoutEffect(() => {
    const options: NativeStackNavigationOptions = {
      headerSearchBarOptions: {
        placeholder: STRINGS.SEARCH_WORDS,
        hideWhenScrolling: false,
        autoCapitalize: 'none',
        onChangeText: event => setSearchQuery(event.nativeEvent.text),
        onCancelButtonPress: () => setSearchQuery(''),
        onClose: () => setSearchQuery(''),
        // Android SearchView colors (iOS adapts to the theme on its own)
        headerIconColor: colors.text,
        textColor: colors.text,
        hintTextColor: colors.textTertiary,
      },
    };
    navigation.setOptions(options);
  }, [navigation, colors.text, colors.textTertiary, setSearchQuery]);

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

  const handleRemoveWord = useCallback(
    async (word: StudyWord) => {
      if (!user?.id) return;
      try {
        // Explicit intent: a delete must never flip into a re-add when the
        // cached study list is stale
        await toggleRootMutation.mutateAsync({
          userId: user.id,
          rootId: word.root_id,
          intent: 'remove',
        });
      } catch (error) {
        await handleError(error instanceof Error ? error : String(error), {
          showToast: true,
          toastMessage: STRINGS.FAILED_TO_DELETE_WORD,
          captureSentry: !__DEV__,
        });
      }
    },
    [user?.id, toggleRootMutation.mutateAsync],
  );

  const handleResetProgress = useCallback(
    (word: StudyWord) => {
      confirmReset(word.root_id);
    },
    [confirmReset],
  );

  const renderItem = useCallback(
    (props: { item: StudyWord; index: number }) => {
      // Cap the stagger to the first ~20 items so deep scrolls don't pay a
      // long entry delay for items the user isn't waiting on.
      const enterDelay = props.index < 20 ? props.index * 20 : 0;
      return (
        <Animated.View style={[ROW_FADE_IN_STYLE, { animationDelay: `${enterDelay}ms` }]}>
          <DictionaryWordCard
            word={props.item}
            onPress={handleWordPress}
            onRemove={handleRemoveWord}
            onResetProgress={handleResetProgress}
          />
        </Animated.View>
      );
    },
    [handleWordPress, handleRemoveWord, handleResetProgress],
  );

  const ListEmptyComponent = useMemo(() => {
    if (hasWords) return null;
    // A fruitless search gets a quiet notice; a truly empty dictionary gets
    // the full call-to-action empty state.
    if (searchQuery.trim()) {
      return (
        <View style={styles.searchEmptyContainer}>
          <ThemedText type="body" variant="secondary" align="center">
            {STRINGS.NO_WORDS_MATCH_SEARCH}
          </ThemedText>
        </View>
      );
    }
    return <DictionaryEmptyState />;
  }, [hasWords, searchQuery]);

  return (
    <ThemedView style={styles.container}>
      {isLoading ? (
        <LoadingState />
      ) : (
        <View style={styles.contentContainer}>
          <FlashList
            data={words}
            renderItem={renderItem}
            ListHeaderComponent={
              totalCount > 0 ? (
                <DictionarySortBar
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSelectField={selectSortField}
                  wordCount={words.length}
                />
              ) : null
            }
            ListEmptyComponent={ListEmptyComponent}
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
