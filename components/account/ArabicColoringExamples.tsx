import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ColorCodedText } from '@/components/common/ColorCodedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

/**
 * Displays interactive colored examples of Arabic text analysis
 * Shows how prefixes, suffixes, and other components are identified and colored
 */
export const ArabicColoringExamples = memo(() => {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Color Legend */}
      <View style={styles.legendContainer}>
        <ThemedText type="caption" weight="semibold" style={styles.legendTitle}>
          Color Guide:
        </ThemedText>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: colors.tint }]} />
            <ThemedText type="caption" colorName="textTertiary">
              Prefix
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: colors.warning }]} />
            <ThemedText type="caption" colorName="textTertiary">
              Suffix
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: colors.accent }]} />
            <ThemedText type="caption" colorName="textTertiary">
              Diacritic
            </ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.colorDot, { backgroundColor: colors.violet }]} />
            <ThemedText type="caption" colorName="textTertiary">
              Infix
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Example 1: Conjunction + Article */}
      <View style={styles.exampleContainer}>
        <View style={styles.arabicRow}>
          <ColorCodedText
            text="وَالْبَيْتِ"
            arabicWord="وَالْبَيْتِ"
            englishTranslation="and the house"
            isArabic={true}
            type="heading1"
            weight="bold"
            style={styles.arabicExample}
          />
        </View>
        <View style={styles.translationRow}>
          <ColorCodedText
            text="and the house"
            arabicWord="وَالْبَيْتِ"
            englishTranslation="and the house"
            isArabic={false}
            type="body"
          />
        </View>
        <ThemedText type="caption" colorName="textTertiary" style={styles.explanation}>
          و (and) + ال (the) + root word
        </ThemedText>
      </View>

      {/* Example 2: Preposition + Possessive */}
      <View style={styles.exampleContainer}>
        <View style={styles.arabicRow}>
          <ColorCodedText
            text="بِكِتَابِي"
            arabicWord="بِكِتَابِي"
            englishTranslation="with my book"
            isArabic={true}
            type="heading1"
            weight="bold"
            style={styles.arabicExample}
          />
        </View>
        <View style={styles.translationRow}>
          <ColorCodedText
            text="with my book"
            arabicWord="بِكِتَابِي"
            englishTranslation="with my book"
            isArabic={false}
            type="body"
          />
        </View>
        <ThemedText type="caption" colorName="textTertiary" style={styles.explanation}>
          ب (with) + root + ي (my)
        </ThemedText>
      </View>

      {/* Example 3: Conjunction + Verb + Plural */}
      <View style={styles.exampleContainer}>
        <View style={styles.arabicRow}>
          <ColorCodedText
            text="فَقَالُوا"
            arabicWord="فَقَالُوا"
            englishTranslation="so they said"
            isArabic={true}
            type="heading1"
            weight="bold"
            style={styles.arabicExample}
          />
        </View>
        <View style={styles.translationRow}>
          <ColorCodedText
            text="so they said"
            arabicWord="فَقَالُوا"
            englishTranslation="so they said"
            isArabic={false}
            type="body"
          />
        </View>
        <ThemedText type="caption" colorName="textTertiary" style={styles.explanation}>
          ف (so) + root + وا (they/plural)
        </ThemedText>
      </View>

      {/* Example 4: Preposition + Article + Plural */}
      <View style={styles.exampleContainer}>
        <View style={styles.arabicRow}>
          <ColorCodedText
            text="لِلْمُسْلِمِينَ"
            arabicWord="لِلْمُسْلِمِينَ"
            englishTranslation="to the Muslims"
            isArabic={true}
            type="heading1"
            weight="bold"
            style={styles.arabicExample}
          />
        </View>
        <View style={styles.translationRow}>
          <ColorCodedText
            text="to the Muslims"
            arabicWord="لِلْمُسْلِمِينَ"
            englishTranslation="to the Muslims"
            isArabic={false}
            type="body"
          />
        </View>
        <ThemedText type="caption" colorName="textTertiary" style={styles.explanation}>
          ل (to) + ال (the) + root + ين (plural)
        </ThemedText>
      </View>

      {/* Note about single words */}
      <View style={styles.noteContainer}>
        <ThemedText type="caption" colorName="textTertiary" style={styles.noteText}>
          Note: Single words like "house" are not colored, only multi-word phrases where component
          analysis adds educational value.
        </ThemedText>
      </View>
    </View>
  );
});

ArabicColoringExamples.displayName = 'ArabicColoringExamples';

const styles = StyleSheet.create({
  container: {
    gap: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  legendContainer: {
    gap: LAYOUT.SPACING.TINY,
  },
  legendTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  exampleContainer: {
    gap: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  arabicRow: {
    alignItems: 'flex-end', // Right-align Arabic text
  },
  arabicExample: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE, // 28px - large and readable
  },
  translationRow: {
    alignItems: 'flex-start', // Left-align English text
  },
  explanation: {
    fontStyle: 'italic',
    marginTop: LAYOUT.SPACING.TINY,
  },
  noteContainer: {
    marginTop: LAYOUT.SPACING.SMALL,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128, 128, 128, 0.2)',
  },
  noteText: {
    fontStyle: 'italic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
});
