import { ScreenScaffold } from '@/components/common/ScreenScaffold';
import type { FC, ReactNode } from 'react';
import { Linking, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { TextLink } from '@/components/ui/TextLink';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';

/**
 * The terms, privacy and attribution screens are long-form prose under a
 * navigation header. Each one used to carry its own copy of the same six-rule
 * StyleSheet and the same nested-ThemedView scaffold, and the auth and account
 * copies of the SAME document had already drifted apart — one gained a looser
 * line height and a contact link, the other didn't.
 *
 * These three components are the whole vocabulary those documents need.
 */

/** A full legal/prose screen. */
export const LegalDocument: FC<{ children: ReactNode }> = ({ children }) => (
  <ScreenScaffold>{children}</ScreenScaffold>
);

/**
 * A section heading. `heading3` is already SemiBold, so no `weight` is passed —
 * the documents used to add `weight="semibold"` on every one of ~40 headings,
 * which did nothing.
 */
export const DocHeading: FC<{ children: ReactNode; level?: 'section' | 'subsection' }> = ({
  children,
  level = 'section',
}) => {
  const isSection = level === 'section';
  return (
    // `bodyBold` is body at semibold — the same thing the documents were
    // spelling as `type="body" weight="semibold"` on every subsection.
    <ThemedText
      style={isSection ? styles.sectionTitle : styles.subsectionTitle}
      type={isSection ? 'heading3' : 'bodyBold'}
    >
      {children}
    </ThemedText>
  );
};

/**
 * A body paragraph. `last` drops the trailing margin for a paragraph that ends
 * the document, so the scroll doesn't finish on dead space.
 */
export const DocParagraph: FC<{ children: ReactNode; last?: boolean }> = ({
  children,
  last = false,
}) => (
  <ThemedText style={[styles.paragraph, last && styles.paragraphLast]} type="body">
    {children}
  </ThemedText>
);

/**
 * An external URL credited in a document. Opens in the system browser.
 *
 * This used to hand-roll a tint-coloured `ThemedText` inside a `Pressable` with
 * a pressed-opacity style callback — a verbatim copy of the very pattern
 * `TextLink` exists to have deleted. It also picked up a hit slop it never had.
 */
export const DocLink: FC<{ url: string }> = ({ url }) => (
  <TextLink
    underline
    label={url}
    style={styles.linkContainer}
    type="body"
    onPress={() => {
      Linking.openURL(url);
    }}
  />
);

/** A credited item — a font, a library — with its one-line description. */
export const DocCredit: FC<{ name: string; description: string }> = ({ name, description }) => (
  <>
    <ThemedText style={styles.creditName} type="bodyBold">
      {name}
    </ThemedText>
    <ThemedText colorName="textTertiary" style={styles.creditDescription} type="caption">
      {description}
    </ThemedText>
  </>
);

/** The "Effective date: …" line that opens a document. */
export const DocEffectiveDate: FC<{ children: ReactNode }> = ({ children }) => (
  <ThemedText colorName="textTertiary" style={styles.effectiveDate} type="caption">
    {children}
  </ThemedText>
);

const styles = StyleSheet.create({
  effectiveDate: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  sectionTitle: {
    marginTop: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  subsectionTitle: {
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  paragraph: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    // Long-form prose gets a looser leading than the app default.
    lineHeight: Math.round(LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * LINE_HEIGHT_MULTIPLIERS.LOOSE),
  },
  paragraphLast: {
    marginBottom: 0,
  },
  linkContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  creditName: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  creditDescription: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
});
