
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetView,
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { memo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseModalProps } from '@/types/ui/modal.types';

const SNAP_POINTS = [330];

interface SessionTypeModalProps extends BaseModalProps {
  onStartAudio: () => void;
  onStartVisual: () => void;
}

const SessionTypeModal = memo(
  ({ visible, onClose, onStartAudio, onStartVisual }: SessionTypeModalProps) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Snap points are static
    const snapPoints = SNAP_POINTS;

    // Handle visibility changes
    useEffect(() => {
      if (visible) {
        bottomSheetRef.current?.expand();
      } else {
        bottomSheetRef.current?.close();
      }
    }, [visible]);

    // Handle when bottom sheet closes (via swipe or backdrop)
    const handleSheetClose = useCallback(() => {
      onClose();
    }, [onClose]);

    // Use built-in backdrop component
    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          onPress={handleSheetClose}
        />
      ),
      [colors.backdropOverlay, handleSheetClose]
    );

    // Don't render if not visible (optimization)
    if (!visible) return null;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableOverDrag={true}
        animateOnMount={true}
        enableDynamicSizing={false}
        onClose={handleSheetClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.elevation1 }}
        handleIndicatorStyle={{ backgroundColor: colors.modalIndicator }}
        style={{ zIndex: 1000 }}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.title} type="heading3">
              {STRINGS.CHOOSE_SESSION_TYPE}
            </ThemedText>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.elevation2,
                },
              ]}
              onPress={onStartVisual}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.elevation3 }]}>
                <Ionicons name="eye" size={24} color={colors.tint} />
              </View>
              <View style={styles.optionContent}>
                <ThemedText style={styles.optionTitle} type="body" weight="semibold">
                  {STRINGS.VISUAL}
                </ThemedText>
                <ThemedText colorName="secondaryText" type="caption">
                  {STRINGS.TAP_AND_SWIPE}
                </ThemedText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.elevation2,
                },
              ]}
              onPress={onStartAudio}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.elevation3 }]}>
                <Ionicons name="ear" size={24} color={colors.tint} />
              </View>
              <View style={styles.optionContent}>
                <ThemedText style={styles.optionTitle} type="body" weight="semibold">
                  {STRINGS.AUDIO}
                </ThemedText>
                <ThemedText colorName="secondaryText" type="caption">
                  {STRINGS.LISTEN_WHILE_MULTITASKING}
                </ThemedText>
              </View>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

SessionTypeModal.displayName = 'SessionTypeModal';

const styles = StyleSheet.create({
  content: {
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  header: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  title: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  optionsContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  optionCard: {
    ...LAYOUT.ELEVATION.SUBTLE,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
});

export default SessionTypeModal;
