import type { FC } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { EmailLink } from '@/components/common/EmailLink';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

const TermsOfServiceScreen: FC = () => {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView
      includeBottomInset={false}
      safeAreaEdges={['left', 'right']}
      style={styles.container}
    >
      <ThemedView
        includeBottomInset={false}
        scrollable={true}
        style={styles.content}
        useSafeArea={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: LAYOUT.SPACING.XLARGE + insets.bottom },
        ]}
      >
        {/* Effective Date */}
        <ThemedText type="caption" colorName="textTertiary" style={styles.effectiveDate}>
          {STRINGS.TERMS_EFFECTIVE_DATE}
        </ThemedText>

        {/* Introduction */}
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.TERMS_INTRO}
        </ThemedText>

        {/* Section 1: Our Service */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.TERMS_SERVICE_DESCRIPTION_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.TERMS_SERVICE_DESCRIPTION}
        </ThemedText>

        {/* Section 2: Your Account */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.TERMS_ACCOUNT_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.TERMS_ACCOUNT}
        </ThemedText>

        {/* Section 3: Acceptable Use */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.TERMS_ACCEPTABLE_USE_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.TERMS_ACCEPTABLE_USE}
        </ThemedText>

        {/* Section 4: Content and Rights */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.TERMS_CONTENT_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.TERMS_CONTENT}
        </ThemedText>

        {/* Section 5: Your Data */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.TERMS_USER_DATA_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.TERMS_USER_DATA}
        </ThemedText>

        {/* Section 6: Disclaimers */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.TERMS_DISCLAIMER_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.TERMS_DISCLAIMER}
        </ThemedText>

        {/* Section 7: Limitation of Liability */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.TERMS_LIABILITY_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.TERMS_LIABILITY}
        </ThemedText>

        {/* Section 8: Changes to Terms */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.TERMS_CHANGES_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.TERMS_CHANGES}
        </ThemedText>

        {/* Section 9: Termination */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.TERMS_TERMINATION_TITLE}
        </ThemedText>
        <ThemedText type="body" style={styles.paragraph}>
          {STRINGS.TERMS_TERMINATION}
        </ThemedText>

        {/* Section 10: Contact */}
        <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
          {STRINGS.TERMS_CONTACT_TITLE}
        </ThemedText>
        <ThemedText type="body" style={[styles.paragraph, { marginBottom: 0 }]}>
          {STRINGS.TERMS_CONTACT}
          <EmailLink email={STRINGS.CONTACT_EMAIL} />
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  effectiveDate: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  sectionTitle: {
    marginTop: LAYOUT.SPACING.LARGE,
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  paragraph: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    lineHeight: Math.round(
      LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * TYPOGRAPHY_HIERARCHY.LINE_HEIGHT_MULTIPLIERS.LOOSE,
    ),
  },
});

export default TermsOfServiceScreen;
