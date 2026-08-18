import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { ColorCodedText, Dot } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

/**
 * The legend names the colours a reader actually meets, in the order they meet
 * them. Words are coloured by grammatical role, not by whether a part sits at
 * the front or the back — an earlier legend of Prefix/Suffix/Diacritic/Infix
 * described the `ComponentType` fallbacks, which the renderer almost never uses,
 * and had the two commonest cases backwards: ال is a prefix painted in the
 * article's colour, ـه is a suffix painted in the possessive's.
 *
 * Keys index `colors.grammar`, so the swatches cannot drift from the paint.
 */
const LEGEND = [
  { role: 'definiteArticle', label: 'The (ال)' },
  { role: 'preposition', label: 'Preposition' },
  { role: 'conjunction', label: 'Joining word' },
  { role: 'possessive', label: 'Possessive' },
  { role: 'subjectPrefix', label: 'Subject marker' },
  { role: 'verbConjugation', label: 'Verb ending' },
  { role: 'plural', label: 'Plural' },
  { role: 'negation', label: 'Negation' },
] as const;

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
          {LEGEND.map(entry => (
            <View key={entry.label} style={styles.legendItem}>
              <Dot color={colors.grammar[entry.role]} />
              <ThemedText type="caption" colorName="textTertiary">
                {entry.label}
              </ThemedText>
            </View>
          ))}
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
            arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.HUGE}
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
            arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.HUGE}
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
            arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.HUGE}
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
            arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.HUGE}
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
      <View style={[styles.noteContainer, { borderTopColor: colors.border }]}>
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
  exampleContainer: {
    gap: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.SMALL,
  },
  arabicRow: {
    alignItems: 'flex-end', // Right-align Arabic text
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
  },
  noteText: {
    fontStyle: 'italic',
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
});
