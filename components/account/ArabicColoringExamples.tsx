import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { ColorCodedText, Dot } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

/**
 * The legend names the colours a reader actually meets, in the order they meet
 * them. Words are coloured by grammatical role, not by whether a part sits at
 * the front or the back — an earlier legend of Prefix/Suffix/Diacritic/Infix
 * described the `ComponentType` fallbacks, which the renderer almost never uses,
 * and had the two commonest cases backwards: ال is a prefix painted in the
 * article's colour, ـه is a suffix painted in the possessive's.
 *
 * Every `grammar.*` colour the reader paints has a row: this is
 * `GRAMMATICAL_ROLE_COLORS` (constants/arabicWordComponents.ts) read from the
 * colour's side. It used to stop at eight, so particles (إن، قد), question
 * words (ما، كم), "this/that" (هذا، ذلك) and the future (سـ، سوف) all appeared
 * in articles with no name. Two roles borrow a colour there and are named with
 * it: standalone pronouns (هو، نحن) are painted in the verb-ending colour, and
 * case endings in the particle colour.
 *
 * Keys index `colors.grammar`, so the swatches cannot drift from the paint.
 */
const LEGEND = [
  'definiteArticle',
  'preposition',
  'conjunction',
  'particle',
  'possessive',
  'subjectPrefix',
  'verbConjugation',
  'plural',
  'negation',
  'interrogative',
  'demonstrative',
  'futureTense',
] as const satisfies readonly (keyof typeof STRINGS.GRAMMAR_LEGEND)[];

/** One worked phrase per combination of parts the legend names. */
const EXAMPLES = [
  // Conjunction + Article
  { arabic: 'وَالْبَيْتِ', english: 'and the house', breakdown: 'و (and) + ال (the) + root word' },
  // Preposition + Possessive
  { arabic: 'بِكِتَابِي', english: 'with my book', breakdown: 'ب (with) + root + ي (my)' },
  // Conjunction + Verb + Plural
  { arabic: 'فَقَالُوا', english: 'so they said', breakdown: 'ف (so) + root + وا (they/plural)' },
  // Preposition + Article + Plural
  {
    arabic: 'لِلْمُسْلِمِينَ',
    english: 'to the Muslims',
    breakdown: 'ل (to) + ال (the) + root + ين (plural)',
  },
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
          {STRINGS.GRAMMAR_LEGEND_TITLE}
        </ThemedText>
        <View style={styles.legendRow}>
          {LEGEND.map(role => (
            <View key={role} style={styles.legendItem}>
              <Dot color={colors.grammar[role]} />
              <ThemedText type="caption" colorName="textTertiary">
                {STRINGS.GRAMMAR_LEGEND[role]}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      {EXAMPLES.map(example => (
        <View key={example.arabic} style={styles.exampleContainer}>
          <View style={styles.arabicRow}>
            <ColorCodedText
              text={example.arabic}
              arabicWord={example.arabic}
              englishTranslation={example.english}
              isArabic={true}
              arabicFontSize={LAYOUT.TYPOGRAPHY.SCALE.HUGE}
            />
          </View>
          <View style={styles.translationRow}>
            <ColorCodedText
              text={example.english}
              arabicWord={example.arabic}
              englishTranslation={example.english}
              isArabic={false}
              type="body"
            />
          </View>
          <ThemedText type="caption" colorName="textTertiary" style={styles.explanation}>
            {/* English formulas start LTR even when their first term is Arabic. */}
            {'\u200e'}
            {example.breakdown}
          </ThemedText>
        </View>
      ))}

      {/* Note about single words */}
      <View style={[styles.noteContainer, { borderTopColor: colors.border }]}>
        <ThemedText type="caption" colorName="textTertiary" style={styles.noteText}>
          {STRINGS.GRAMMAR_LEGEND_SINGLE_WORD_NOTE}
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
    marginTop: LAYOUT.SPACING.TINY,
  },
  noteContainer: {
    marginTop: LAYOUT.SPACING.SMALL,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: 1,
  },
  noteText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
});
