import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { FC } from 'react';
import { memo, useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';

import { GenericBottomSheet } from '@/components/common/GenericBottomSheet';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface TermsOfServiceModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: FC<TermsOfServiceModalProps> = memo(
  ({ isVisible, onClose }) => {
    const snapPoints = useMemo(() => [SCREEN_HEIGHT * 0.85], []);

    return (
      <GenericBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        title={STRINGS.TERMS_OF_SERVICE}
        snapPoints={snapPoints}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.content}
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
          <ThemedText type="body" style={styles.lastParagraph}>
            {STRINGS.TERMS_CONTACT}
          </ThemedText>
        </BottomSheetScrollView>
      </GenericBottomSheet>
    );
  },
);

TermsOfServiceModal.displayName = 'TermsOfServiceModal';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.XLARGE,
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
    lineHeight: 22,
  },
  lastParagraph: {
    lineHeight: 22,
  },
});
