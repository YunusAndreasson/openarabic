import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { FC } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export interface PrivacyPolicyModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: FC<PrivacyPolicyModalProps> = memo(
  ({ isVisible, onClose }) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);
    const snapPoints = useMemo(() => [SCREEN_HEIGHT * 0.85], []);

    // Show/hide modal based on isVisible prop
    useEffect(() => {
      if (isVisible) {
        bottomSheetRef.current?.expand();
      } else {
        bottomSheetRef.current?.close();
      }
    }, [isVisible]);

    // Handle sheet position changes
    const handleChange = useCallback(
      (index: number) => {
        if (index === -1) {
          onClose();
        }
      },
      [onClose],
    );

    // Use built-in backdrop component
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          pressBehavior="close"
          onPress={onClose}
        />
      ),
      [onClose],
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleChange}
        enablePanDownToClose={true}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.elevation1 }}
        handleIndicatorStyle={{ backgroundColor: colors.modalIndicator }}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="heading3" weight="bold">
            {STRINGS.PRIVACY_POLICY}
          </ThemedText>
        </View>

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
      </BottomSheet>
    );
  },
);

PrivacyPolicyModal.displayName = 'PrivacyPolicyModal';

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
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
