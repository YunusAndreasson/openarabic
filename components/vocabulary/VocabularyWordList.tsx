import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import type { ListRenderItem } from '@shopify/flash-list';
import { FlashList } from '@shopify/flash-list';
import { BlurView } from 'expo-blur';
import type { ComponentProps } from 'react';
import React, { memo, useCallback } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import type { StudyWord } from '@/types/vocabulary.types';

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
    const isLearning = studyWord.fsrs_state === 1 || studyWord.fsrs_state === 2;
    const isMastered = studyWord.fsrs_state === 3;
    const isOverdue = studyWord.fsrs_due ? new Date(studyWord.fsrs_due) < new Date() : false;

    let statusLabel = isMastered ? 'Mastered' : isLearning ? 'Learning' : 'New';
    if (isOverdue) statusLabel = 'Due';

    let statusIcon = isMastered ? 'checkmark-circle' : isLearning ? 'school' : 'star';
    if (isOverdue) statusIcon = 'time';

    return (
      <ThemedCard variant="basic" onPress={onPress} style={styles.wordCard}>
        <View style={styles.wordInfo}>
          <ThemedText type="heading3" numberOfLines={1}>
            {word}
          </ThemedText>
          <View style={styles.translationContainer}>
            <ThemedText type="body" variant="secondary">
              {english}
            </ThemedText>
          </View>
        </View>
        <View style={styles.statusContainer}>
          <BlurView intensity={isDarkMode ? 3 : 10} tint="light" style={styles.statusPill}>
            <View
              style={[
                styles.statusBackground,
                {
                  backgroundColor: isMastered
                    ? colors.elevation3
                    : isOverdue
                      ? colors.warning
                      : colors.info,
                },
              ]}
            >
              <Ionicons
                name={statusIcon as ComponentProps<typeof Ionicons>['name']}
                size={16}
                color={colors.background}
              />
              <ThemedText type="caption" weight="semibold" colorName="background" skipDefaultColor>
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
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();

  // Memoize the render item function to prevent recreating on each render
  const renderItem = useCallback<ListRenderItem<StudyWord>>(
    ({ item: studyWord }) => (
      <WordItem studyWord={studyWord} onPress={() => onWordPress(studyWord)} colors={colors} />
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
          <ThemedText type="heading3">{title}</ThemedText>
        </View>
        <View style={styles.emptyContainer}>
          <ThemedText type="body" variant="disabled">
            No words
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <ThemedText type="heading3">{title}</ThemedText>
      </View>
      <FlashList
        data={words}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={70}
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
        drawDistance={500}
        estimatedFirstItemOffset={0}
        overrideItemLayout={(layout, _item) => {
          layout.size = 70 + LAYOUT.SPACING.MEDIUM; // Add spacing to item height
        }}
        ItemSeparatorComponent={() => <View style={{ height: LAYOUT.SPACING.MEDIUM }} />}
      />
    </View>
  );
}

// Define the styles with proper TypeScript types
const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: LAYOUT.SPACING.XXLARGE,
  } as ViewStyle,
  emptyContainer: {
    padding: LAYOUT.SPACING.XLARGE,
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
