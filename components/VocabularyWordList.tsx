import React, { useCallback } from 'react';
import { StyleSheet, View, FlatList, ListRenderItem, TextStyle, ViewStyle } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { CompactThemedCard } from './CompactThemedCard';
import { LAYOUT, getArabicTextStyle } from '@/constants/layout';
import { useWordStatus } from '@/hooks/useWordStatus';
import { StudyWord } from '@/types/vocabulary.types';

interface VocabularyWordListProps {
  title: string;
  words: StudyWord[];
  onWordPress: (word: StudyWord) => void;
}

// Separate word item component for better performance
const WordItem = React.memo(
  ({ studyWord, onPress, colors }: { studyWord: StudyWord; onPress: () => void; colors: any }) => {
    // Use hooks outside of conditionals
    const { statusLabel, statusIcon, isMastered, isOverdue } = useWordStatus(
      studyWord.next_review_at,
      studyWord.interval_days
    );

    const word = studyWord.sentence_word;
    if (!word) return null;

    return (
      <CompactThemedCard onPress={onPress}>
        <View style={styles.wordInfo}>
          <ThemedText
            style={[
              styles.arabicWord,
              {
                color: colors.arabicText,
              },
            ]}
            skipDefaultColor
          >
            {word.word_form}
          </ThemedText>
          <ThemedText style={styles.translation}>{word.english}</ThemedText>
        </View>
        <View style={styles.statusContainer}>
          <BlurView intensity={10} tint="light" style={styles.statusPill}>
            <View
              style={[
                styles.statusBackground,
                {
                  backgroundColor: isMastered
                    ? '#495057'
                    : isOverdue
                      ? colors.warning
                      : colors.info,
                },
              ]}
            >
              <Ionicons name={statusIcon} size={16} color={colors.background} />
              <ThemedText
                style={[styles.statusText, { color: colors.background }]}
                skipDefaultColor
              >
                {statusLabel}
              </ThemedText>
            </View>
          </BlurView>
        </View>
      </CompactThemedCard>
    );
  }
);

WordItem.displayName = 'WordItem';

export function VocabularyWordList({ title, words, onWordPress }: VocabularyWordListProps) {
  const colors = useColors();

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
        <ThemedText style={styles.title}>{title}</ThemedText>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>No words available</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ThemedText style={styles.title}>{title}</ThemedText>
      <FlatList
        data={words}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        maxToRenderPerBatch={10} // Limit batch size for smoother performance
        windowSize={5} // Reduce window size for better performance
        initialNumToRender={10} // Limit initial render for better startup time
        removeClippedSubviews={true} // Improve memory usage by detaching off-screen views
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
  title: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE,
    fontWeight: '600',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  } as TextStyle,
  listContent: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    gap: LAYOUT.SPACING.MEDIUM,
  } as ViewStyle,
  wordInfo: {
    flex: 1,
    marginRight: LAYOUT.SPACING.SMALL,
  } as ViewStyle,
  arabicWord: {
    ...getArabicTextStyle(LAYOUT.TYPOGRAPHY.SCALE.XXLARGE, {
      marginBottom: LAYOUT.SPACING.TINY,
    }),
  } as TextStyle,
  translation: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: 0.8,
  } as TextStyle,
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
  statusText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    fontWeight: '600',
  } as TextStyle,
  emptyContainer: {
    padding: LAYOUT.SPACING.XLARGE,
    alignItems: 'center',
    justifyContent: 'center',
  } as ViewStyle,
  emptyText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.DISABLED,
  } as TextStyle,
});
