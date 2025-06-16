import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { useCallback, useRef, useEffect, memo, type FC } from 'react';
import { View, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

interface MeaningBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

const MeaningBottomSheet: FC<MeaningBottomSheetProps> = memo(({ visible, onClose }) => {
  const colors = useColors();
  const bottomSheetRef = useRef<BottomSheet>(null);

  const snapPoints = ['30%'];

  useEffect(() => {
    if (visible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.3}
        onPress={handleClose}
      />
    ),
    [handleClose]
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={[styles.bottomSheet, { backgroundColor: colors.elevation1 }]}
      handleIndicatorStyle={{ backgroundColor: colors.border }}
      onClose={handleClose}
    >
      <BottomSheetView style={[styles.content, { backgroundColor: colors.elevation1 }]}>
        <View style={styles.header}>
          <ThemedText type="heading3">How to practice</ThemedText>
        </View>

        <View style={styles.instructionsContainer}>
          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: colors.elevation2 }]}>
              <Ionicons name="arrow-back" size={18} color={colors.captionText} />
            </View>
            <ThemedText>Swipe left if you do not know</ThemedText>
          </View>

          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: colors.elevation2 }]}>
              <Ionicons name="finger-print" size={18} color={colors.captionText} />
            </View>
            <ThemedText>Tap if you know it vaguely</ThemedText>
          </View>

          <View style={styles.instructionItem}>
            <View style={[styles.instructionIcon, { backgroundColor: colors.elevation2 }]}>
              <Ionicons name="arrow-forward" size={18} color={colors.captionText} />
            </View>
            <ThemedText>Swipe right if you know</ThemedText>
          </View>
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
});

MeaningBottomSheet.displayName = 'MeaningBottomSheet';

const styles = StyleSheet.create({
  bottomSheet: {
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  content: {
    flex: 1,
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.LARGE,
  },
  header: {
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingTop: LAYOUT.SPACING.SMALL,
  },
  instructionsContainer: {
    gap: LAYOUT.SPACING.LARGE,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  instructionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
});

export default MeaningBottomSheet;
