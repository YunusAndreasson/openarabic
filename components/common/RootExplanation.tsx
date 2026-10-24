import { StyleSheet, View } from 'react-native';

// Direct paths, not the barrel: this file lives in `common`, so importing its
// own barrel would pull in every sibling and close an import cycle.
import { ListRow } from '@/components/common/ListRow';
import { ThemedText } from '@/components/primitives/ThemedText';
import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { LAYOUT, getCompactArabicFontSize } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useDebouncedArabicFontSize } from '@/hooks/theme/useDebouncedArabicFontSize';
import type { RootId } from '@/types/branded.types';
import type { RootEnrichment, RootFamilyMember } from '@/types/rootEnrichment.types';
import { fillTemplate } from '@/utils/fillTemplate';

/**
 * Where this renders, which decides how much of the record it shows.
 *
 * One axis rather than separate flags, because they never vary independently —
 * they are one decision about which surface you are on.
 *
 * Root explanations and family lists are inline on both surfaces. The sheet deferred the
 * family list to stay short, and that was the wrong thing to protect: what a
 * word is built from is why the panel exists, and a learner who tapped a word to
 * ask what it is should not have to ask twice. The sheet scrolls.
 *
 * - `screen`: the full account — senses and the attribution line as well.
 * - `sheet`: drops those two. Senses are empty on all but a handful of records
 *   (see below), and the citation is one line between the learner and the
 *   sentence they were reading.
 */
type RootExplanationVariant = 'screen' | 'sheet';

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
 * `senses` is rendered on the screen variant but is empty on nearly every record
 * the app will ever see: the fan-out that put this panel on 84.7% of the
 * dictionary writes `[]` on purpose, because the column holds the HEADWORD's own
 * meanings and shipping none beats shipping the root's. The block is kept
 * because it is correct whenever the data is there; populating it is a pipeline
 * backfill, not a UI change.
 *
 * The radicals are rendered plain, never grammar-coloured, for the same reason
 * the word screen's headword is not (see the comment there): the colouring
 * describes prefixes and case endings on an inflected form, and a bare root has
 * neither.
 */
export const RootExplanation = ({
  enrichment,
  variant = 'screen',
  onOpenFamilyMember,
  canOpenFamilyMember,
}: RootExplanationProps) => {
  const isSheet = variant === 'sheet';
  const arabicFontSize = getCompactArabicFontSize(useDebouncedArabicFontSize(100));

  const { triliteralRoot, rootTransliteration, rootMeaning } = enrichment;
  const summary = fillTemplate(STRINGS.WORD_ROOT_SUMMARY, {
    transliteration: rootTransliteration,
    meaning: rootMeaning,
  });
  const rootA11y = fillTemplate(STRINGS.WORD_ROOT_A11Y, {
    root: rootTransliteration,
    meaning: rootMeaning,
  });

  // Every member, on both surfaces. The sheet used to show three, to stay short.
  // What a word is built from is the reason this panel exists, so trimming it to
  // protect the sheet's height was protecting the wrong thing.
  const family = enrichment.wordFamily;

  /** The root, named and read. Identical on both surfaces — it is the payload. */
  const heading = (
    <>
      <ThemedText colorName="subtleLabelText" type="overline">
        {STRINGS.WORD_ROOT_SECTION_TITLE}
      </ThemedText>
      {/* Radicals lead: they are the payload, and the transliteration plus the
          shared sense sit under them as the reading of it.

          align="left" because the radicals are a heading here, not running
          text. Arabic defaults to RTL layout, which pinned "ق ل ب" to the
          right screen edge — a whole column away from the label above it and
          the transliteration directly beneath, so the three lines read as
          three unrelated things instead of one. */}
      <View accessible accessibilityLabel={rootA11y} style={styles.rootBlock}>
        <ThemedText align="left" style={{ fontSize: arabicFontSize }} type="arabicCompact">
          {triliteralRoot}
        </ThemedText>
        <ThemedText colorName="secondaryText" type="body">
          {summary}
        </ThemedText>
      </View>
    </>
  );

  const prose = enrichment.usageNote ? (
    <ThemedText colorName="secondaryText" style={styles.prose} type="body">
      {enrichment.usageNote}
    </ThemedText>
  ) : null;

  /**
   * Shown outright on both surfaces, never behind a chevron.
   *
   * The sheet used to defer it to protect its height. That was the wrong thing
   * to protect: the family list is the strongest teaching asset in the record,
   * and a learner who tapped a word to ask what it is should not have to ask
   * twice. The sheet scrolls; that is what a scroll is for.
   */
  const familyBlock =
    family.length > 0 ? (
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
    ) : null;

  if (isSheet) {
    // No `section` style here, and no margin of its own: the sheet decides the
    // lead above this block. Carrying it here made the gap under the card's
    // action button depend on whether the word HAS a root record.
    //
    // Against the screen variant this drops only senses (empty on all but a
    // handful of records) and the attribution line, and caps the family — the
    // sheet is a reading interruption, not the full account.
    return (
      <View style={styles.sheetSection}>
        {heading}
        {prose}
        {familyBlock}
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {heading}
      {prose}

      {enrichment.senses.length > 0 && (
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

      {familyBlock}

      {/* Attribution belongs with the full account. In the reading sheet it is
          one more line between the learner and the sentence they were reading,
          and the same citation is one tap away on the word screen. */}
      <ThemedText colorName="textTertiary" style={styles.source} type="caption">
        {fillTemplate(STRINGS.WORD_ROOT_SOURCE, { source: enrichment.source })}
      </ThemedText>
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
const FamilyRow = ({ member, arabicFontSize, onOpen, canOpen }: FamilyRowProps) => {
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
      <DisclosureChevron />
    </ListRow>
  );
};

RootExplanation.displayName = 'RootExplanation';

const styles = StyleSheet.create({
  section: {
    gap: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.XLARGE,
  },
  // Same block, minus the lead — see the comment in the sheet branch.
  sheetSection: {
    gap: LAYOUT.SPACING.SMALL,
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
  flex: {
    flex: 1,
  },
  source: {
    marginTop: LAYOUT.SPACING.LARGE,
  },
});
