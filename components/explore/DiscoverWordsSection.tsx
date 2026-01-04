import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { memo, useCallback, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { BaseCard, SectionLabel } from '@/components/common';
import { useToast } from '@/components/providers/ToastProvider';
import { DEFAULT_SESSION_COOLDOWN_HOURS } from '@/constants/fsrs';
import { LAYOUT, SCREEN_WIDTH } from '@/constants/layout';
import { fsrsQueries } from '@/constants/queries';
import { STRINGS } from '@/constants/strings';
import { useAuth } from '@/hooks/auth/useAuth';
import { useStudyWordMutations } from '@/hooks/articles/useStudyWordMutations';
import { useColors } from '@/hooks/theme/useColors';
import { studyWordsFSRSService } from '@/services/studyWordsFSRS';
import type { RootId } from '@/types/branded.types';
import type { Tables } from '@/types/database.types';
import { ToastType } from '@/types/enums';
import type { StudyWord } from '@/types/vocabulary.types';
import { successFeedback } from '@/utils/haptics';
import { capitalizeFirstLetter } from '@/utils/stringUtils';

/** Number of common words to show in the discover section */
const DISCOVER_WORDS_COUNT = 15;

/** Card width for horizontal scroll (fits 2.5 cards on screen for peek effect) */
const CARD_WIDTH = (SCREEN_WIDTH - LAYOUT.SCREEN_HORIZONTAL_PADDING * 2) / 2.5;

interface WordChipProps {
  root: Tables<'roots'>;
  onPress: (rootId: RootId) => void;
}

/**
 * Individual word chip that shows Arabic + English
 * Tap to add to practice list
 */
const WordChip = memo<WordChipProps>(({ root, onPress }) => {
  const colors = useColors();

  const handlePress = useCallback(() => {
    onPress(root.id as RootId);
  }, [root.id, onPress]);

  return (
    <BaseCard
      style={styles.chip}
      contentStyle={styles.chipContent}
      onPress={handlePress}
      shadowSize="subtle"
    >
      {/* Arabic text */}
      <ThemedText
        type="arabic"
        arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XLARGE}
        weight="semibold"
        numberOfLines={1}
        style={styles.arabicText}
      >
        {root.letters}
      </ThemedText>

      {/* English meaning */}
      <ThemedText
        type="caption"
        variant="secondary"
        numberOfLines={1}
        style={styles.englishText}
      >
        {capitalizeFirstLetter(root.meaning || '')}
      </ThemedText>

      {/* Add icon */}
      <View style={styles.iconContainer}>
        <Ionicons
          name="add-circle-outline"
          size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
          color={colors.tint}
        />
      </View>
    </BaseCard>
  );
});

WordChip.displayName = 'WordChip';

interface DiscoverWordsSectionProps {
  /** Optional callback after a word is added */
  onWordAdded?: () => void;
}

/**
 * Horizontal scrollable section showing common Arabic words
 * Tapping a word adds it to the Practice list
 */
const DiscoverWordsSectionComponent = memo<DiscoverWordsSectionProps>(({ onWordAdded }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Fetch common roots
  const { data: commonRoots = [] } = useQuery({
    queryKey: ['discoverCommonRoots', DISCOVER_WORDS_COUNT],
    queryFn: () => studyWordsFSRSService.getCommonRoots(DISCOVER_WORDS_COUNT),
    staleTime: Infinity, // Common roots don't change
  });

  // Get user's current study words to check which are already added
  const { data: studyWords = [] } = useQuery({
    ...fsrsQueries.allWithCooldown(user?.id ?? '', DEFAULT_SESSION_COOLDOWN_HOURS),
    enabled: !!user?.id,
  });

  // Create a Set of added root IDs for O(1) lookup
  const addedRootIds = useMemo(() => {
    return new Set((studyWords as StudyWord[]).map(sw => sw.root_id));
  }, [studyWords]);

  // Filter to only show words not yet added to practice
  const availableRoots = useMemo(() => {
    return commonRoots.filter(root => !addedRootIds.has(root.id as RootId));
  }, [commonRoots, addedRootIds]);

  // Use study word mutations hook for adding/removing words
  const { handleRootPress } = useStudyWordMutations();

  // Handle word chip press - add to practice with haptic feedback and toast
  const handleWordPress = useCallback(
    async (rootId: RootId) => {
      successFeedback();
      await handleRootPress(rootId);
      showToast(STRINGS.WORD_ADDED_TO_PRACTICE, undefined, ToastType.SUCCESS);
      onWordAdded?.();
    },
    [handleRootPress, showToast, onWordAdded],
  );

  // Don't render if no available roots or user not authenticated
  if (!user?.id || availableRoots.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <SectionLabel title={STRINGS.SECTION_DISCOVER_WORDS} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {availableRoots.map(root => (
          <WordChip key={root.id} root={root} onPress={handleWordPress} />
        ))}
      </ScrollView>
    </View>
  );
});

DiscoverWordsSectionComponent.displayName = 'DiscoverWordsSection';

export const DiscoverWordsSection = DiscoverWordsSectionComponent;

const styles = StyleSheet.create({
  container: {
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    gap: LAYOUT.SPACING.SMALL,
  },
  chip: {
    width: CARD_WIDTH,
  },
  chipContent: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
    padding: LAYOUT.SPACING.MEDIUM,
  },
  arabicText: {
    textAlign: 'center',
  },
  englishText: {
    textAlign: 'center',
  },
  iconContainer: {
    marginTop: LAYOUT.SPACING.TINY,
  },
});
