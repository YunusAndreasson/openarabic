import { ScreenScaffold } from '@/components/common/ScreenScaffold';
import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { TextLink } from '@/components/ui/TextLink';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS } from '@/constants/layout';
import { openExternalUrl } from '@/utils/openExternalUrl';

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
export const LegalDocument = ({ children }: { children: ReactNode }) => (
  <ScreenScaffold>{children}</ScreenScaffold>
);

/**
 * A section heading. `heading3` is already SemiBold, so no `weight` is passed —
 * the documents used to add `weight="semibold"` on every one of ~40 headings,
 * which did nothing.
 */
export const DocHeading = ({
  children,
  level = 'section',
}: {
  children: ReactNode;
  level?: 'section' | 'subsection';
}) => {
  const isSection = level === 'section';
  return (
    // `bodyBold` is body at semibold — the same thing the documents were
    // spelling as `type="body" weight="semibold"` on every subsection.
    <ThemedText
      accessibilityRole="header"
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
export const DocParagraph = ({
  children,
  last = false,
}: {
  children: ReactNode;
  last?: boolean;
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
 *
 * A URL the system refuses is reported, not left as an unhandled rejection.
 */
export const DocLink = ({ url }: { url: string }) => (
  <TextLink
    underline
    label={url}
    style={styles.linkContainer}
    type="body"
    onPress={() => {
      void openExternalUrl(url, {
        analyticsEventName: 'Legal_Link_Failed',
        sentryTags: { location: 'legal_document', action: 'open_url' },
        showToast: false,
        sentrySeverity: 'info',
      });
    }}
  />
);

/** A credited item — a font, a library — with its one-line description. */
export const DocCredit = ({ name, description }: { name: string; description: string }) => (
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
export const DocEffectiveDate = ({ children }: { children: ReactNode }) => (
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
