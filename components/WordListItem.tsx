import React, { useMemo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import { useColors } from '../hooks/useColors';
import { LAYOUT, getArabicTextStyle } from '../constants/layout';
import { StudyWord } from '../types/vocabulary.types';
import Animated from 'react-native-reanimated';
import { useCardAnimation } from '../hooks/animations';

interface WordListItemProps {
  word: StudyWord;
  onPress: () => void;
  masteryScore?: number; // Optional mastery score from 0-100
}

export default function WordListItem({ word, onPress, masteryScore }: WordListItemProps) {
  const colors = useColors();

  // Use card animation for press effect
  const { animatedStyle, handlePressIn, handlePressOut } = useCardAnimation(0.97, 0.95);

  // Get the actual word data
  const { word_form, english } = word.sentence_word || {};

  // Get mastery color using memo to avoid recalculation - matching the legend exactly
  const masteryColor = useMemo(() => {
    if (masteryScore === undefined) return colors.tint;

    // Exactly match the color segments from the legend
    if (masteryScore >= 80) return colors.success; // Green (Mastered)
    if (masteryScore >= 60) return '#63a744'; // Light green (Almost mastered)
    if (masteryScore >= 40) return '#ebb434'; // Yellow (Half-learned)
    if (masteryScore >= 20) return '#f7941d'; // Orange (Beginning to learn)
    return colors.error; // Red (Just started)
  }, [masteryScore, colors]);

  // If no word data, return null
  if (!word_form) return null;

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          styles.container,
          { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        <View style={styles.content}>
          {/* Left side with English text and mastery dot */}
          <View style={styles.leftContent}>
            {/* Mastery dot indicator */}
            {masteryScore !== undefined && (
              <View style={[styles.masteryDot, { backgroundColor: masteryColor }]} />
            )}

            <ThemedText
              style={[styles.englishText, { color: colors.englishText }]}
              skipDefaultColor
              numberOfLines={2}
            >
              {english || 'No translation available'}
            </ThemedText>
          </View>

          {/* Arabic text on the right */}
          <ThemedText style={[styles.arabicText, { color: colors.arabicText }]} skipDefaultColor>
            {word_form}
          </ThemedText>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    ...LAYOUT.SHADOW.MEDIUM, // Match shadow level with other cards in vocabulary screen
    paddingVertical: LAYOUT.SPACING.SMALL - 2,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    marginVertical: LAYOUT.SPACING.TINY / 4, // More consistent with other cards
  },
  content: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: LAYOUT.SPACING.SMALL,
  },
  masteryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: LAYOUT.SPACING.SMALL,
  },
  arabicText: {
    ...getArabicTextStyle(LAYOUT.TYPOGRAPHY.SCALE.HUGE + 1, {
      textAlign: 'right',
      fontWeight: '600',
    }),
    flex: 0.5,
  },
  englishText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM,
    opacity: LAYOUT.OPACITY.MEDIUM_HIGH, // Match opacity with other secondary text
    flex: 1,
  },
});
