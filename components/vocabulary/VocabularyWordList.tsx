import React, { useCallback } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { ThemedText } from '../ThemedText';
import { useColors } from '@/hooks/useColors';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import ThemedCard from '../ThemedCard';
import { LAYOUT, getHeaderHeight } from '@/constants/layout';
import { StudyWord } from '@/types/vocabulary.types';
import { useIsDarkMode } from '@/hooks/useThemeDetection';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface VocabularyWordListProps {
  title: string;
  words: StudyWord[];
  onWordPress: (word: StudyWord) => void;
}

// Separate word item component for better performance
const WordItem = React.memo(
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
    const word = studyWord.sentence_word?.word_form || '...';
    const english = studyWord.sentence_word?.english || '...';
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
          <BlurView intensity={10} tint={isDarkMode ? 'dark' : 'light'} style={styles.statusPill}>
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
              <Ionicons name={statusIcon as any} size={16} color={colors.background} />
              <ThemedText type="caption" weight="600" colorName="background" skipDefaultColor>
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

export function VocabularyWordList({ title, words, onWordPress }: VocabularyWordListProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Memoize the render item function to prevent recreating on each render
  const renderItem = useCallback<ListRenderItem<StudyWord>>(
    ({ item: studyWord }) => (
      <WordItem studyWord={studyWord} onPress={() => onWordPress(studyWord)} colors={colors} />
    ),
    [colors, onWordPress]
  );

  // Memoize key extractor for better performance
  const keyExtractor = useCallback((item: StudyWord) => `${item.sentence_word_id}`, []);

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
          paddingTop: getHeaderHeight(insets),
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
  titleContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  } as ViewStyle,
  wordInfo: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  } as ViewStyle,
  translationContainer: {
    marginTop: LAYOUT.SPACING.TINY,
  } as ViewStyle,
  statusContainer: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    overflow: 'hidden',
  } as ViewStyle,
  statusPill: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  } as ViewStyle,
  statusBackground: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.SMALL - 2,
    gap: LAYOUT.SPACING.SMALL - 2,
  } as ViewStyle,
  emptyContainer: {
    padding: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  wordCard: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  } as ViewStyle,
});
