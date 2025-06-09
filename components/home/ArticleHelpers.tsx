import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

/**
 * DifficultyIndicator component to display article difficulty
 */
export const DifficultyIndicator = memo(
  ({ level, hideLabel = false }: { level: number; hideLabel?: boolean }) => {
    const colors = useColors();
    const isDarkMode = useIsDarkMode();

    // Normalize level to be between 1-5
    const normalizedLevel = Math.max(1, Math.min(5, level));

    // Get difficulty label based on level
    const difficultyLabel = useMemo(() => {
      switch (normalizedLevel) {
        case 1:
          return 'Beginner';
        case 2:
          return 'Elementary';
        case 3:
          return 'Intermediate';
        case 4:
          return 'Advanced';
        case 5:
          return 'Expert';
        default:
          return 'Intermediate';
      }
    }, [normalizedLevel]);

    return (
      <View style={styles.difficultyContainer}>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map(star => (
            <Ionicons
              key={star}
              name="star"
              size={12}
              style={styles.starIcon}
              color={
                star <= normalizedLevel
                  ? colors.tint
                  : isDarkMode
                    ? colors.white + '40'
                    : colors.cardBorder
              }
            />
          ))}
        </View>
        {!hideLabel ? (
          <View style={styles.difficultyTextContainer}>
            <ThemedText
              colorName={isDarkMode ? 'text' : undefined}
              skipDefaultColor={!isDarkMode}
              type="caption"
              variant={isDarkMode ? undefined : 'subtle'}
            >
              {difficultyLabel}
            </ThemedText>
          </View>
        ) : null}
      </View>
    );
  }
);

DifficultyIndicator.displayName = 'DifficultyIndicator';

/**
 * SummaryIndicator component to display article summary in compact views
 */
export const SummaryIndicator = memo(({ summary }: { summary: string | null }) => {
  if (!summary) return null;

  return (
    <View style={styles.summaryIndicatorContainer}>
      <ThemedText colorName="textTertiary" style={styles.summaryText} type="caption">
        {summary}
      </ThemedText>
    </View>
  );
});

SummaryIndicator.displayName = 'SummaryIndicator';

const styles = StyleSheet.create({
  // DifficultyIndicator styles
  difficultyContainer: {
    alignItems: 'flex-start',
    flexDirection: 'column',
  },
  difficultyTextContainer: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  starIcon: {
    marginRight: LAYOUT.SPACING.TINY,
  },
  starsContainer: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  summaryIndicatorContainer: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    marginTop: LAYOUT.SPACING.TINY,
  },
  summaryText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.6,
  },
});
