import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import type { StudyWord } from '../../types/vocabulary.types';
import { ThemedText } from '../ThemedText';

interface WordListItemProps {
  word: StudyWord & { retentionScore?: number };
}

// Memoize the component to prevent unnecessary re-renders
const WordListItem = memo(function WordListItem({ word }: WordListItemProps) {
  const colors = useColors();

  // Get the actual word data from root
  const letters = word.root?.letters || '';
  const meaning = word.root?.meaning || '';

  // Capitalize first letter of meaning
  const capitalizedMeaning = meaning ? meaning.charAt(0).toUpperCase() + meaning.slice(1) : '';

  // Return null early if there's no word data
  if (!letters) return null;

  return (
    <View style={styles.container}>
      {/* Main Content - Word and Translation */}
      <View style={styles.mainContent}>
        {/* Left side - English meaning with clean layout */}
        <View style={styles.leftContent}>
          <View style={styles.textContent}>
            {/* Primary: Word meaning with optional streak badge */}
            <View style={styles.titleRow}>
              <ThemedText
                skipDefaultColor
                numberOfLines={2}
                style={[styles.meaningText, { color: colors.text }]}
                type="body"
                weight="bold"
              >
                {capitalizedMeaning || 'No translation available'}
              </ThemedText>
              {/* Streak badge - positioned as visual accent */}
              {word.success_streak !== undefined && word.success_streak > 0 && (
                <View
                  style={[
                    styles.streakBadge,
                    {
                      backgroundColor:
                        word.success_streak >= 15
                          ? colors.success + '15'
                          : word.success_streak >= 10
                            ? colors.warning + '15'
                            : word.success_streak >= 5
                              ? colors.info + '15'
                              : colors.interactiveSecondary + '15',
                    },
                  ]}
                >
                  <ThemedText
                    skipDefaultColor
                    type="caption"
                    weight="bold"
                    style={[
                      styles.streakText,
                      {
                        color:
                          word.success_streak >= 15
                            ? colors.success
                            : word.success_streak >= 10
                              ? colors.warning
                              : word.success_streak >= 5
                                ? colors.info
                                : colors.interactiveSecondary,
                      },
                    ]}
                  >
                    🔥{word.success_streak}
                  </ThemedText>
                </View>
              )}
            </View>

            {/* Secondary: Memory strength indicator */}
            {word.retentionScore !== undefined && (
              <View style={styles.memoryRow}>
                <View style={styles.memoryLabel}>
                  <ThemedText
                    skipDefaultColor
                    style={[styles.memoryPercentage, { color: colors.interactiveSecondary }]}
                    type="caption"
                    weight="medium"
                  >
                    {word.retentionScore}%
                  </ThemedText>
                </View>
                <View style={styles.progressTrackContainer}>
                  <View
                    style={[styles.progressTrack, { backgroundColor: colors.progressBackground }]}
                  >
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${word.retentionScore || 0}%`,
                          backgroundColor:
                            word.retentionScore >= 85
                              ? colors.success
                              : word.retentionScore >= 70
                                ? colors.warning
                                : word.retentionScore >= 50
                                  ? colors.info
                                  : colors.error,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Right side - Arabic text with interaction indicator */}
        <View style={styles.rightContent}>
          <View style={styles.arabicContainer}>
            <ThemedText
              skipDefaultColor
              align="center"
              colorName="arabicText"
              numberOfLines={1}
              style={styles.arabicText}
              type="arabic"
              weight="bold"
            >
              {letters}
            </ThemedText>
          </View>
          {/* Subtle interaction indicator */}
          <View style={styles.chevronContainer}>
            <ThemedText
              skipDefaultColor
              style={[styles.chevronIcon, { color: colors.interactiveSecondary }]}
            >
              ›
            </ThemedText>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  arabicContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: LAYOUT.SPACING.LARGE, // Space for chevron without cutting text
  },
  arabicText: {
    textAlign: 'center',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XLARGE + 6, // Slightly smaller but still prominent
    lineHeight: 44, // Adjusted for smaller font
    letterSpacing: 0.5,
    fontWeight: '600',
    textAlignVertical: 'center',
    paddingTop: LAYOUT.SPACING.SMALL,
    paddingBottom: LAYOUT.SPACING.XSMALL,
  },
  chevronContainer: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    position: 'absolute',
    right: LAYOUT.SPACING.TINY,
    top: '50%',
    transform: [{ translateY: -12 }],
    width: 24,
  },
  chevronIcon: {
    fontSize: 24, // Much larger, standard interactive size
    fontWeight: '500',
    letterSpacing: 0,
    opacity: 0.7, // Restore opacity for proper visual hierarchy
  },
  container: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM, // Reduced from MEDIUM + 2 for tighter spacing
    minHeight: 90, // Optimized height for content density
  },
  leftContent: {
    flex: 1,
    paddingRight: LAYOUT.SPACING.LARGE, // Increased for better separation from Arabic
    justifyContent: 'center',
  },
  mainContent: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.XLARGE,
    justifyContent: 'space-between', // Increased for better visual separation (proximity principle)
  },
  meaningText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM + 2, // Primary text prominence
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.3, // Optimal readability
    fontWeight: '700',
    letterSpacing: -0.4, // Refined letter spacing for elegance
    marginBottom: 0,
  },
  memoryLabel: {
    minWidth: 34, // Optimized for percentage display
  },
  memoryPercentage: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL + 1, // Slightly larger for better hierarchy
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
    fontWeight: '600',
    letterSpacing: 0.3, // Refined letter spacing
  },
  memoryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM, // Restored for better visual grouping
  },
  progressFill: {
    borderRadius: 2,
    height: '100%',
  },
  progressTrack: {
    height: 4, // Slightly thicker for better visibility
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressTrackContainer: {
    flex: 1,
    maxWidth: 110, // Optimized width for better proportions
  },
  rightContent: {
    alignItems: 'center',
    justifyContent: 'center', // Back to center for better layout
    minWidth: 130, // Increased to give more space for Arabic text
    paddingLeft: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingRight: LAYOUT.SPACING.SMALL, // Minimal right padding
    flex: 0,
    position: 'relative', // For absolute positioning of chevron
  },
  streakBadge: {
    paddingHorizontal: LAYOUT.SPACING.SMALL + 1, // Slightly more padding
    paddingVertical: LAYOUT.SPACING.XSMALL,
    borderRadius: 8, // More refined radius
    alignSelf: 'flex-start', // Align with text baseline
    minWidth: 48, // Ensure minimum touch target size
    minHeight: 32, // Adequate touch height
  },
  streakText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL, // Restored readability
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.1,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textContent: {
    flex: 1,
    gap: LAYOUT.SPACING.MEDIUM, // Restored optimal spacing for clear grouping
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center', // Changed to center for better visual balance
    gap: LAYOUT.SPACING.LARGE, // Increased from MEDIUM to LARGE for better separation
    marginBottom: 0,
  },
});

export default WordListItem;
