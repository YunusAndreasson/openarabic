import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { State } from 'ts-fsrs';
import { Ionicons } from '@expo/vector-icons';

import { LAYOUT } from '../../constants/layout';
import { useColors } from '../../hooks/useColors';
import type { StudyWord } from '../../types/vocabulary.types';
import { ThemedText } from '../ThemedText';

interface WordListItemProps {
  word: StudyWord;
}

// Memoize the component to prevent unnecessary re-renders
const WordListItem = memo(function WordListItem({ word }: WordListItemProps) {
  const colors = useColors();

  // Get the actual word data from root
  const letters = word.root?.letters || '';
  const meaning = word.root?.meaning || '';

  // Capitalize first letter of meaning
  const capitalizedMeaning = meaning ? meaning.charAt(0).toUpperCase() + meaning.slice(1) : '';

  // Enhanced status indicator with better visual feedback
  const statusInfo = useMemo(() => {
    const stability = word.fsrs_stability || 0;
    const state = word.fsrs_state;

    // Enhanced status calculation with better visual hierarchy
    if (state === State.New) {
      return {
        color: colors.textTertiary,
        indicator: '●',
        label: 'New',
        bgColor: colors.textTertiary + '15',
      };
    } else if (stability >= 30) {
      return {
        color: colors.success,
        indicator: '●',
        label: 'Mastered',
        bgColor: colors.success + '15',
      };
    } else if (stability >= 7) {
      return {
        color: colors.warning,
        indicator: '●',
        label: 'Learning',
        bgColor: colors.warning + '15',
      };
    } else {
      return {
        color: colors.info,
        indicator: '●',
        label: 'Reviewing',
        bgColor: colors.info + '15',
      };
    }
  }, [word.fsrs_stability, word.fsrs_state, colors]);

  // Return null early if there's no word data
  if (!letters) return null;

  return (
    <View style={styles.container}>
      {/* Main Content - Word and Translation */}
      <View style={styles.mainContent}>
        {/* Left side - English meaning with enhanced status indicator */}
        <View style={styles.leftContent}>
          <View style={styles.meaningRow}>
            <View style={[styles.statusIndicator, { backgroundColor: statusInfo.bgColor }]}>
              <ThemedText style={[styles.statusDot, { color: statusInfo.color }]}>
                {statusInfo.indicator}
              </ThemedText>
            </View>
            <View style={styles.textContent}>
              <ThemedText
                type="heading3"
                weight="semibold"
                numberOfLines={2}
                style={styles.meaningText}
              >
                {capitalizedMeaning || 'No translation available'}
              </ThemedText>
              {/* Subtle status label for better context */}
              <ThemedText
                type="caption"
                variant="subtle"
                style={[styles.statusLabel, { color: statusInfo.color }]}
              >
                {statusInfo.label}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Right side - Arabic text and navigation with better spacing */}
        <View style={styles.rightContent}>
          <View style={styles.arabicContainer}>
            <ThemedText
              type="arabic"
              arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.XLARGE + 4}
              weight="bold"
              align="right"
              skipDefaultColor
              colorName="arabicText"
              style={styles.arabicText}
            >
              {letters}
            </ThemedText>
          </View>

          {/* Enhanced navigation indicator */}
          <View style={styles.navigationContainer}>
            <View style={[styles.navigationButton, { backgroundColor: colors.buttonOverlay }]}>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.tint}
                style={styles.navigationIcon}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: LAYOUT.SPACING.MEDIUM,
    minHeight: 72, // Ensure consistent height for better scrolling
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  leftContent: {
    flex: 1,
  },
  meaningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: LAYOUT.SPACING.SMALL,
  },
  statusIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 20,
    height: 20,
    borderRadius: 10,
    marginTop: 2, // Align with text baseline
  },
  statusDot: {
    fontSize: 10,
    lineHeight: 10,
  },
  textContent: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY / 2,
  },
  meaningText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.LARGE * 1.2,
    marginBottom: 0,
  },
  statusLabel: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.TINY * 1.2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  arabicContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 40,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  arabicText: {
    textAlign: 'right',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XLARGE * 1.4,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  navigationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationIcon: {
    opacity: 0.8,
  },
});

export default WordListItem;
