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

export interface TermsOfServiceModalProps {
  isVisible: boolean;
  onClose: () => void;
}

export const TermsOfServiceModal: FC<TermsOfServiceModalProps> = memo(
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
            {STRINGS.TERMS_OF_SERVICE}
          </ThemedText>
        </View>

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
      </BottomSheet>
    );
  },
);

TermsOfServiceModal.displayName = 'TermsOfServiceModal';

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
  paragraph: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    lineHeight: 22,
  },
  lastParagraph: {
    lineHeight: 22,
  },
});
