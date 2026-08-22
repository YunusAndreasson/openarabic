import type { FC } from 'react';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ListRow } from '@/components/common/ListRow';
import { Ionicons } from '@/components/ui/Icon';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT, getCompactArabicFontSize } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import type { RootId } from '@/types/branded.types';
import type { RootEnrichment, RootFamilyMember } from '@/types/rootEnrichment.types';

/**
 * Where this renders, which decides how much of the record it shows.
 *
 * One axis rather than four independent flags (collapsible / senses / family /
 * attribution), because those four never vary independently — they are one
 * decision about which surface you are on, and separate booleans would let a
 * caller assemble a combination neither surface wants.
 *
 * - `screen`: the full account, open. Section title, senses, every family
 *   member, attribution.
 * - `sheet`: one collapsed line that opens to the usage note and nothing else.
 *   Measured on device, the fuller version filled 85% of the screen and had to
 *   scroll, which is the opposite of a surface whose job is keeping the learner
 *   in the text. Senses and family are a click away on the word screen, where
 *   there is room to lay them out.
 */
type RootExplanationVariant = 'screen' | 'sheet';

/**
 * Three rows in the sheet against five on the screen. `maxDynamicContentSize` is
 * 85% of the screen, so the ceiling is real; and the sheet exists to get the
 * learner back to their sentence, which a full family list works against.
 */
const SHEET_FAMILY_LIMIT = 3;

interface RootExplanationProps {
  enrichment: RootEnrichment;
  variant?: RootExplanationVariant;
  /**
   * Called when a family member is tapped. A member is only made pressable when
   * the caller supplies this AND that member resolved to a headword in our
   * dictionary — see the note on `isLinkable` below.
   */
  onOpenFamilyMember?: (rootId: RootId) => void;
  /**
   * Whether THIS member has a destination, asked per member.
   *
   * Replaces a gate that could not be right: the screen enabled tapping when
   * ANY member was in the practice list, while this component then made EVERY
   * member with a `rootId` pressable — so on a panel with one saved word, four
   * rows looked tappable and landed on "no longer in your practice list". An
   * affordance that lies is worse than no affordance.
   *
   * Omitted means "any resolved member is fine", which is what a caller that
   * can open every word wants.
   */
  canOpenFamilyMember?: (rootId: RootId) => boolean;
}

/**
 * "Where this word comes from" — the synthesised root explanation.
 *
 * Presentational by design: it takes the record as a prop and calls no domain
 * hook, which is what lets it sit in `common` and be shared by the practice word
 * screen and the reader's word sheet without either importing the other's
 * feature directory.
 *
 * What it deliberately does NOT render:
 * - `faq`, which exists to feed FAQPage JSON-LD on the website. Its answers
 *   restate the senses in question form, and question-shaped padding is exactly
 *   the "dumped into the app" failure a phone surface cannot absorb.
 * - `partOfSpeech`, because the word screen already derives part of speech from
 *   real corpus usage (`utils/wordUsage.ts`). Two sources would contradict each
 *   other on the same screen, and the corpus one is the one grounded in what the
 *   learner has actually read.
 *
 * The radicals are rendered plain, never grammar-coloured, for the same reason
 * the word screen's headword is not (see the comment there): the colouring
 * describes prefixes and case endings on an inflected form, and a bare root has
 * neither.
 */
export const RootExplanation: FC<RootExplanationProps> = ({
  enrichment,
  variant = 'screen',
  onOpenFamilyMember,
  canOpenFamilyMember,
}) => {
  const isSheet = variant === 'sheet';
  const colors = useColors();
  const [isExpanded, setIsExpanded] = useState(false);
  const arabicFontSize = getCompactArabicFontSize(useDebouncedArabicFontSize(100));

  const { triliteralRoot, rootTransliteration, rootMeaning } = enrichment;
  const summary = STRINGS.WORD_ROOT_SUMMARY.replace(
    '{transliteration}',
    rootTransliteration,
  ).replace('{meaning}', rootMeaning);
  const rootA11y = STRINGS.WORD_ROOT_A11Y.replace('{root}', rootTransliteration).replace(
    '{meaning}',
    rootMeaning,
  );

  // The sheet showed NO family, while its caller's comment said "capped at
  // three" and this file's own header promised the same. The code was the odd
  // one out: expanded, the sheet was a bare paragraph, and the family list is
  // the strongest teaching asset in the record — a learner who expanded the row
  // is asking for exactly it. Three, not five, because the sheet's job is to
  // return them to the sentence they were reading.
  const family = isSheet
    ? enrichment.wordFamily.slice(0, SHEET_FAMILY_LIMIT)
    : enrichment.wordFamily;
  const isOpen = !isSheet || isExpanded;

  const body = (
    <>
      {enrichment.usageNote && (
        <ThemedText colorName="secondaryText" style={styles.prose} type="body">
          {enrichment.usageNote}
        </ThemedText>
      )}

      {!isSheet && enrichment.senses.length > 0 && (
        <View style={styles.block}>
          <ThemedText colorName="subtleLabelText" type="overline">
            {STRINGS.WORD_ROOT_SENSES_TITLE}
          </ThemedText>
          {enrichment.senses.map((sense, index) => (
            <View key={sense.gloss} style={styles.sense}>
              {/* The ordinal is the only numbering a learner needs; senses are
                  emitted most-common-first, so position carries meaning. */}
              <ThemedText colorName="textTertiary" style={styles.ordinal} type="body">
                {index + 1}
              </ThemedText>
              <View style={styles.senseText}>
                <ThemedText type="body">{sense.gloss}</ThemedText>
                {sense.note && (
                  <ThemedText colorName="secondaryText" type="caption">
                    {sense.note}
                  </ThemedText>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {family.length > 0 && (
        <View style={styles.block}>
          <ThemedText colorName="subtleLabelText" type="overline">
            {STRINGS.WORD_ROOT_FAMILY_TITLE}
          </ThemedText>
          {family.map(member => (
            <FamilyRow
              key={`${member.letters}-${member.meaning}`}
              arabicFontSize={arabicFontSize}
              canOpen={canOpenFamilyMember}
              member={member}
              onOpen={onOpenFamilyMember}
            />
          ))}
        </View>
      )}

      {/* Attribution belongs with the full account. In the reading sheet it is
          one more line between the learner and the sentence they were reading,
          and the same citation is one tap away on the word screen. */}
      {!isSheet && (
        <ThemedText colorName="textTertiary" style={styles.source} type="caption">
          {STRINGS.WORD_ROOT_SOURCE.replace('{source}', enrichment.source)}
        </ThemedText>
      )}
    </>
  );

  if (isSheet) {
    return (
      <View>
        <ListRow
          accessibilityLabel={
            isExpanded ? STRINGS.WORD_ROOT_COLLAPSE_A11Y : STRINGS.WORD_ROOT_EXPAND_A11Y
          }
          density="compact"
          hapticType="selection"
          onPress={() => setIsExpanded(open => !open)}
        >
          <View style={styles.summaryRow}>
            <ThemedText colorName="subtleLabelText" type="caption">
              {STRINGS.WORD_ROOT_LABEL}
            </ThemedText>
            <ThemedText style={{ fontSize: arabicFontSize }} type="arabicCompact">
              {triliteralRoot}
            </ThemedText>
            <ThemedText
              colorName="secondaryText"
              numberOfLines={1}
              style={styles.flex}
              type="caption"
            >
              {rootMeaning}
            </ThemedText>
          </View>
          {/* The signifier. A line with more behind it has to say so, or it
              reads as a dead end and never gets opened. */}
          <Ionicons
            color={colors.textTertiary}
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          />
        </ListRow>
        {isOpen && (
          <Animated.View entering={FadeIn.duration(160)} style={styles.expanded}>
            {body}
          </Animated.View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <ThemedText colorName="subtleLabelText" type="overline">
        {STRINGS.WORD_ROOT_SECTION_TITLE}
      </ThemedText>
      {/* Radicals lead: they are the payload, and the transliteration plus the
          shared sense sit under them as the reading of it. */}
      <View accessible accessibilityLabel={rootA11y} style={styles.rootBlock}>
        {/* align="left" because the radicals are a heading here, not running
            text. Arabic defaults to RTL layout, which pinned "ق ل ب" to the
            right screen edge — a whole column away from the label above it and
            the transliteration directly beneath, so the three lines read as
            three unrelated things instead of one. */}
        <ThemedText align="left" style={{ fontSize: arabicFontSize }} type="arabicCompact">
          {triliteralRoot}
        </ThemedText>
        <ThemedText colorName="secondaryText" type="body">
          {summary}
        </ThemedText>
      </View>
      {body}
    </View>
  );
};

interface FamilyRowProps {
  member: RootFamilyMember;
  arabicFontSize: number;
  onOpen?: (rootId: RootId) => void;
  canOpen?: (rootId: RootId) => boolean;
}

/**
 * One word from the same root.
 *
 * Pressable only when three things hold: the pipeline matched this form to a
 * headword in our dictionary, the caller offered a destination, and the caller
 * confirms THIS member is reachable. The third is the one that was missing —
 * the word screen refuses to render a word the learner has not saved, so rows
 * for unsaved members looked tappable and landed on "no longer in your practice
 * list". Unlinkable members stay plain text, which is honest.
 */
const FamilyRow: FC<FamilyRowProps> = ({ member, arabicFontSize, onOpen, canOpen }) => {
  const { rootId } = member;
  const isLinkable = rootId != null && !!onOpen && (canOpen?.(rootId) ?? true);

  const content = (
    <View style={styles.flex}>
      <View style={styles.familyHeading}>
        <ThemedText style={{ fontSize: arabicFontSize }} type="arabicCompact">
          {member.letters}
        </ThemedText>
        {!!member.transliteration && (
          <ThemedText colorName="textTertiary" type="caption">
            {member.transliteration}
          </ThemedText>
        )}
      </View>
      <ThemedText colorName="secondaryText" type="caption">
        {member.meaning}
      </ThemedText>
      {/* The one field a learner cannot derive. Broken plurals are irregular by
          definition (عَالِم -> عُلَمَاء), so where Lane's states one it is worth a
          line; the morphological pattern, which IS derivable and reads as a
          formula, deliberately is not. Its own row so the Arabic never sits
          inside a left-to-right sentence — mixed-direction runs reorder. */}
      {!!member.plural && (
        <View style={styles.familyHeading}>
          <ThemedText colorName="textTertiary" type="caption">
            {STRINGS.WORD_ROOT_PLURAL}
          </ThemedText>
          <ThemedText style={{ fontSize: arabicFontSize }} type="arabicCompact">
            {member.plural}
          </ThemedText>
        </View>
      )}
    </View>
  );

  // `divider` on both branches: a member's gloss can run to three lines, and
  // five of them with nothing between read as one paragraph rather than a list.
  if (!isLinkable) {
    return (
      <ListRow density="compact" divider>
        {content}
      </ListRow>
    );
  }

  return (
    <ListRow density="compact" divider hapticType="selection" onPress={() => onOpen(rootId)}>
      {content}
    </ListRow>
  );
};

RootExplanation.displayName = 'RootExplanation';

const styles = StyleSheet.create({
  section: {
    gap: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  rootBlock: {
    gap: LAYOUT.SPACING.TINY,
  },
  prose: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.5,
    marginTop: LAYOUT.SPACING.SMALL,
  },
  block: {
    gap: LAYOUT.SPACING.TINY,
    marginTop: LAYOUT.SPACING.LARGE,
  },
  sense: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  ordinal: {
    minWidth: LAYOUT.SPACING.LARGE,
  },
  senseText: {
    flex: 1,
    gap: LAYOUT.SPACING.TINY,
  },
  familyHeading: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
  },
  summaryRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
  },
  flex: {
    flex: 1,
  },
  expanded: {
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  source: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
});
