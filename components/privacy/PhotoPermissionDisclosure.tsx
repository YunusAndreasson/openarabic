import { Ionicons } from '@expo/vector-icons';
import type { FC } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

interface PhotoPermissionDisclosureProps {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export const PhotoPermissionDisclosure: FC<PhotoPermissionDisclosureProps> = ({
  visible,
  onAccept,
  onDecline,
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="fade" transparent={true} visible={visible} statusBarTranslucent={true}>
      <View style={[styles.backdrop, { backgroundColor: colors.backdropOverlay }]}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.elevation2,
              borderColor: colors.cardBorder,
              paddingBottom: LAYOUT.SPACING.XLARGE + insets.bottom,
            },
          ]}
        >
          <View style={styles.header}>
            <Ionicons
              color={colors.tint}
              name="images"
              size={LAYOUT.BUTTON.ICON_SIZE.XLARGE}
              style={styles.icon}
            />
            <ThemedText
              type="heading2"
              weight="semibold"
              style={styles.title}
              colorName="text"
            >
              {STRINGS.PHOTO_PERMISSION_TITLE}
            </ThemedText>
          </View>

          <ThemedText
            type="body"
            colorName="metadataText"
            style={styles.description}
            weight="medium"
          >
            {STRINGS.PHOTO_PERMISSION_DESCRIPTION}
          </ThemedText>

          <View style={styles.detailsContainer}>
            {STRINGS.PHOTO_PERMISSION_DETAILS.map(detail => (
              <View key={detail} style={styles.detailRow}>
                <Ionicons
                  color={colors.tint}
                  name="checkmark-circle"
                  size={LAYOUT.BUTTON.ICON_SIZE.SMALL + 4}
                  style={styles.detailIcon}
                />
                <ThemedText type="body" colorName="secondaryText" style={styles.detailText}>
                  {detail}
                </ThemedText>
              </View>
            ))}
          </View>

          <ThemedText type="caption" colorName="textTertiary" style={styles.privacyNote}>
            {STRINGS.PHOTO_PERMISSION_PRIVACY_NOTE}
          </ThemedText>

          <View style={styles.buttonGroup}>
            <ThemedButton
              title={STRINGS.PHOTO_PERMISSION_ACTION_ALLOW}
              onPress={onAccept}
              size="large"
            />
            <ThemedButton
              title={STRINGS.PHOTO_PERMISSION_ACTION_NOT_NOW}
              onPress={onDecline}
              variant="outlined"
              size="large"
              textWeight="normal"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
  },
  card: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
    paddingHorizontal: LAYOUT.SPACING.XLARGE,
    paddingTop: LAYOUT.SPACING.XXLARGE,
  },
  header: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  icon: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  title: {
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  detailsContainer: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  detailRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  detailIcon: {
    marginRight: LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.TINY / 2,
  },
  detailText: {
    flex: 1,
  },
  privacyNote: {
    textAlign: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  buttonGroup: {
    gap: LAYOUT.SPACING.MEDIUM,
  },
});

PhotoPermissionDisclosure.displayName = 'PhotoPermissionDisclosure';
