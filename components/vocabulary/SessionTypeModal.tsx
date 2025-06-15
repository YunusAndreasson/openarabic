// TODO: Replace with Expo Router native modal presentation
// Use router.push('/(tabs)/practice/session-type') with presentation: 'modal' instead
// This custom Modal should be replaced with native Expo Router modal for better performance

import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import type { BaseModalProps } from '@/types/ui/modal.types';

interface SessionTypeModalProps extends BaseModalProps {
  onStartAudio: () => void;
  onStartVisual: () => void;
}

const SessionTypeModal = memo(
  ({ visible, onClose, onStartAudio, onStartVisual }: SessionTypeModalProps) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);

    // Configure snap points - use fixed height to guarantee both buttons are visible
    const snapPoints = useMemo(() => [330], []);

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

    // Memoize backdrop component to prevent re-renders
    const backdropComponent = useCallback(
      (props: any) => (
        <View
          style={[props.style, [styles.backdrop, { backgroundColor: colors.backdropOverlay }]]}
          onTouchStart={handleSheetClose}
          pointerEvents="auto"
        />
      ),
      [colors.backdropOverlay, handleSheetClose]
    );

    // Memoize dynamic styles to prevent recalculation
    const dynamicStyles = useMemo(
      () => ({
        background: [styles.background, { backgroundColor: colors.card }],
        indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
        optionCard: { backgroundColor: colors.elevation1 },
        iconContainer: { backgroundColor: colors.tintBackground },
      }),
      [colors.card, colors.modalIndicator, colors.elevation1, colors.tintBackground]
    );

    // Don't render if not visible (optimization)
    if (!visible) return null;

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableOverDrag={false}
        enableDynamicSizing={false}
        animateOnMount={true}
        activeOffsetY={[-10, 10]}
        onClose={handleSheetClose}
        backgroundStyle={dynamicStyles.background}
        handleIndicatorStyle={dynamicStyles.indicator}
        backdropComponent={backdropComponent}
      >
        <BottomSheetView style={styles.content}>
          <View style={styles.header}>
            <ThemedText style={styles.title} type="heading3">
              Choose session type
            </ThemedText>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[styles.optionCard, dynamicStyles.optionCard]}
              onPress={onStartVisual}
            >
              <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                <Ionicons name="eye" size={24} color={colors.tint} />
              </View>
              <View style={styles.optionContent}>
                <ThemedText style={styles.optionTitle} type="body" weight="semibold">
                  Visual
                </ThemedText>
                <ThemedText colorName="secondaryText" type="caption">
                  Tap and swipe
                </ThemedText>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.optionCard, dynamicStyles.optionCard]}
              onPress={onStartAudio}
            >
              <View style={[styles.iconContainer, dynamicStyles.iconContainer]}>
                <Ionicons name="ear" size={24} color={colors.tint} />
              </View>
              <View style={styles.optionContent}>
                <ThemedText style={styles.optionTitle} type="body" weight="semibold">
                  Audio
                </ThemedText>
                <ThemedText colorName="secondaryText" type="caption">
                  Listen while multitasking
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
  background: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  backdrop: {
    // backgroundColor handled dynamically via colors.backdropOverlay
  },
  indicator: {
    width: 32,
    height: 4,
  },
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
