import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import type { ListRenderItem } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import React, { memo, useCallback } from 'react';
import type { ComponentProps , JSX } from 'react';
import type { ViewStyle } from 'react-native';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT, TYPOGRAPHY_HIERARCHY, getEnhancedOpacity } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { StudyWord } from '@/types/vocabulary.types';
import { isMasteredWord, isLearningWord, isDueWord } from '@/utils/wordClassification';

import ThemedCard from '../ThemedCard';
import { ThemedText } from '../ThemedText';

interface VocabularyWordListProps {
  title: string;
  words: StudyWord[];
  onWordPress: (word: StudyWord) => void;
}

// Separate word item component for better performance
const WordItem = memo(
  ({
    studyWord,
    onPress,
    colors,
  }: {
    studyWord: StudyWord;
    onPress: () => void;
    colors: ReturnType<typeof useColors>;
  }) => {
    const isDarkMode = useIsDarkMode();
    const word = studyWord.root?.letters || '...';
    const english = studyWord.root?.meaning || '...';
    const isMastered = isMasteredWord(studyWord);
    const isReview = studyWord.fsrs_state === 2 && (studyWord.fsrs_stability ?? 0) < 5;
    const isLearning = isLearningWord(studyWord) && !isReview; // Learning but not in review
    const isOverdue = isDueWord(studyWord);

    let statusLabel = 'New';
    let statusIcon = 'star';

    if (isMastered) {
      statusLabel = 'Strong';
      statusIcon = 'checkmark-circle';
    } else if (isReview) {
      statusLabel = 'Review';
      statusIcon = 'refresh';
    } else if (isLearning) {
      statusLabel = 'Learning';
      statusIcon = 'school';
    }

    if (isOverdue) {
      statusLabel = 'Due';
      statusIcon = 'time';
    }

    // Enhanced styles with semantic colors
    const wordTextStyle = React.useMemo(
      () => ({
        fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.SEMIBOLD,
        letterSpacing:
          TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.letterSpacing,
        lineHeight:
          LAYOUT.TYPOGRAPHY.SCALE.LARGE *
          TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.CARD_TITLE.lineHeightMultiplier,
        opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY, isDarkMode),
      }),
      [isDarkMode]
    );

    const translationTextStyle = React.useMemo(
      () => ({
        opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.SECONDARY, isDarkMode),
        letterSpacing: TYPOGRAPHY_HIERARCHY.LETTER_SPACING.RELAXED,
      }),
      [isDarkMode]
    );

    return (
      <ThemedCard style={styles.wordCard} variant="basic" onPress={onPress}>
        <View style={styles.wordInfo}>
          <ThemedText
            colorName="headingText"
            numberOfLines={1}
            style={wordTextStyle}
            type="heading3"
          >
            {word}
          </ThemedText>
          <View style={styles.translationContainer}>
            <ThemedText colorName="secondaryText" style={translationTextStyle} type="body">
              {english}
            </ThemedText>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <BlurView intensity={isDarkMode ? 3 : 10} style={styles.statusPill} tint="light">
            <View
              style={[
                styles.statusBackground,
                {
                  backgroundColor: isMastered
                    ? colors.success
                    : isOverdue
                      ? colors.warning
                      : colors.info,
                },
              ]}
            >
              <Ionicons
                color={colors.background}
                name={statusIcon as ComponentProps<typeof Ionicons>['name']}
                size={16}
              />
              <ThemedText skipDefaultColor colorName="background" type="caption" weight="semibold">
                {statusLabel}
              </ThemedText>
            </View>
          </BlurView>
        </View>
      </ThemedCard>
    );
  }
);

WordItem.displayName = 'WordItem';

export function VocabularyWordList({
  title,
  words,
  onWordPress,
}: VocabularyWordListProps): JSX.Element {
  const colors = useColors();
  const isDarkMode = useIsDarkMode();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  // Enhanced title style
  const titleStyle = React.useMemo(
    () => ({
      fontWeight: TYPOGRAPHY_HIERARCHY.WEIGHTS.BOLD,
      letterSpacing:
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.SECTION_HEADER.letterSpacing,
      lineHeight:
        LAYOUT.TYPOGRAPHY.SCALE.XXLARGE *
        TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.SECTION_HEADER.lineHeightMultiplier,
      opacity: getEnhancedOpacity(TYPOGRAPHY_HIERARCHY.COLOR_HIERARCHY.PRIMARY, isDarkMode),
    }),
    [isDarkMode]
  );

  // Memoize the render item function to prevent recreating on each render
  const renderItem = useCallback<ListRenderItem<StudyWord>>(
    ({ item: studyWord }) => (
      <WordItem colors={colors} studyWord={studyWord} onPress={() => onWordPress(studyWord)} />
    ),
    [colors, onWordPress]
  );

  // Memoize key extractor for better performance
  const keyExtractor = useCallback((item: StudyWord) => `${item.root_id}`, []);

  // If there are no words, show a simple message
  if (words.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.titleContainer}>
          <ThemedText colorName="headingText" style={titleStyle} type="heading2">
            {title}
          </ThemedText>
        </View>
        <View style={styles.emptyContainer}>
          <ThemedText colorName="captionText" type="body">
            Start adding words to build your vocabulary
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <ThemedText colorName="headingText" style={titleStyle} type="heading2">
          {title}
        </ThemedText>
      </View>
      <FlashList
        accessibilityLabel="Vocabulary words list"
        data={words}
        drawDistance={500}
        estimatedFirstItemOffset={0}
        estimatedItemSize={70}
        ItemSeparatorComponent={() => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
          paddingTop:
            headerHeight +
            LAYOUT.SPACING.TINY +
            LAYOUT.SPACING.SMALL +
            LAYOUT.BUTTON.HEIGHT.MEDIUM +
            LAYOUT.SPACING.MEDIUM,
          paddingBottom: LAYOUT.CONTENT_SPACING.BOTTOM + insets.bottom + LAYOUT.SPACING.SMALL,
        }}
        overrideItemLayout={(layout, _item) => {
          layout.size = 70 + LAYOUT.SPACING.MEDIUM; // Add spacing to item height
        }}
      />
    </View>
  );
}

// Define the styles with proper TypeScript types and enhanced styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: LAYOUT.SPACING.XXLARGE,
  } as ViewStyle,
  emptyContainer: {
    padding: LAYOUT.SPACING.LARGE,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  statusBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL - 2,
    gap: LAYOUT.SPACING.SMALL - 2,
  } as ViewStyle,
  statusContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  } as ViewStyle,
  statusPill: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  } as ViewStyle,
  titleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  } as ViewStyle,
  translationContainer: {
    marginTop: LAYOUT.SPACING.TINY,
  } as ViewStyle,
  wordCard: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  } as ViewStyle,
  wordInfo: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  } as ViewStyle,
});
