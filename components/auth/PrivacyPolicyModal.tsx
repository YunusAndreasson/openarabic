import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { FC } from 'react';
import { memo, useMemo } from 'react';
import { Dimensions, StyleSheet } from 'react-native';

import { GenericBottomSheet } from '@/components/common/GenericBottomSheet';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface PrivacyPolicyModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: FC<PrivacyPolicyModalProps> = memo(
  ({ isVisible, onClose }) => {
    const snapPoints = useMemo(() => [SCREEN_HEIGHT * 0.85], []);

    return (
      <GenericBottomSheet
        isVisible={isVisible}
        onClose={onClose}
        title={STRINGS.PRIVACY_POLICY}
        snapPoints={snapPoints}
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.content}
        >
          {/* Effective Date */}
          <ThemedText type="caption" colorName="textTertiary" style={styles.effectiveDate}>
            {STRINGS.PRIVACY_EFFECTIVE_DATE}
          </ThemedText>

          {/* Introduction */}
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_INTRO}
          </ThemedText>

          {/* Section 1: Information We Collect */}
          <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
            {STRINGS.PRIVACY_COLLECTION_TITLE}
          </ThemedText>

          {/* Account Information */}
          <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
            {STRINGS.PRIVACY_COLLECTION_ACCOUNT}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_COLLECTION_ACCOUNT_DESC}
          </ThemedText>

          {/* Learning Data */}
          <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
            {STRINGS.PRIVACY_COLLECTION_LEARNING}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_COLLECTION_LEARNING_DESC}
          </ThemedText>

          {/* Usage Analytics */}
          <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
            {STRINGS.PRIVACY_COLLECTION_ANALYTICS}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_COLLECTION_ANALYTICS_DESC}
          </ThemedText>

          {/* Section 2: How We Use Your Information */}
          <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
            {STRINGS.PRIVACY_USE_TITLE}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_USE}
          </ThemedText>

          {/* Section 3: Third-Party Services */}
          <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
            {STRINGS.PRIVACY_THIRD_PARTY_TITLE}
          </ThemedText>

          {/* Supabase */}
          <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
            {STRINGS.PRIVACY_THIRD_PARTY_SUPABASE}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_THIRD_PARTY_SUPABASE_DESC}
          </ThemedText>

          {/* Mixpanel */}
          <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
            {STRINGS.PRIVACY_THIRD_PARTY_MIXPANEL}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_THIRD_PARTY_MIXPANEL_DESC}
          </ThemedText>

          {/* Apple and Google */}
          <ThemedText type="body" weight="semibold" style={styles.subsectionTitle}>
            {STRINGS.PRIVACY_THIRD_PARTY_AUTH}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_THIRD_PARTY_AUTH_DESC}
          </ThemedText>

          {/* Section 4: Data Security */}
          <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
            {STRINGS.PRIVACY_SECURITY_TITLE}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_SECURITY}
          </ThemedText>

          {/* Section 5: Your Rights */}
          <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
            {STRINGS.PRIVACY_RIGHTS_TITLE}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_RIGHTS}
          </ThemedText>

          {/* Section 6: Children's Privacy */}
          <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
            {STRINGS.PRIVACY_CHILDREN_TITLE}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_CHILDREN}
          </ThemedText>

          {/* Section 7: Changes to This Policy */}
          <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
            {STRINGS.PRIVACY_CHANGES_TITLE}
          </ThemedText>
          <ThemedText type="body" style={styles.paragraph}>
            {STRINGS.PRIVACY_CHANGES}
          </ThemedText>

          {/* Section 8: Contact Us */}
          <ThemedText type="heading3" weight="semibold" style={styles.sectionTitle}>
            {STRINGS.PRIVACY_CONTACT_TITLE}
          </ThemedText>
          <ThemedText type="body" style={styles.lastParagraph}>
            {STRINGS.PRIVACY_CONTACT}
          </ThemedText>
        </BottomSheetScrollView>
      </GenericBottomSheet>
    );
  },
);

PrivacyPolicyModal.displayName = 'PrivacyPolicyModal';

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
  subsectionTitle: {
    marginTop: LAYOUT.SPACING.SMALL,
    marginBottom: LAYOUT.SPACING.TINY,
  },
  paragraph: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    lineHeight: 22,
  },
  lastParagraph: {
    lineHeight: 22,
  },
});
