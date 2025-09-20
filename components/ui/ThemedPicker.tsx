import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { memo, useCallback, useEffect, useMemo, useRef, type FC } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import BaseCard from '@/components/common/BaseCard';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { lightFeedback } from '@/utils/haptics';

export interface ThemedPickerOption {
  id: string | number;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface ThemedPickerProps {
  isVisible: boolean;
  onClose: () => void;
  onSelect: (id: string | number) => void;
  options: ThemedPickerOption[];
  title: string;
  snapPoints?: number[];
  selectedValue?: string | number;
}

export const ThemedPicker: FC<ThemedPickerProps> = memo(
  ({ isVisible, onClose, onSelect, options, title, snapPoints = [320], selectedValue }) => {
    const colors = useColors();
    const bottomSheetRef = useRef<BottomSheet>(null);

    useEffect(() => {
      if (isVisible) {
        bottomSheetRef.current?.expand();
      } else {
        bottomSheetRef.current?.close();
      }
    }, [isVisible]);

    const handleSelect = useCallback(
      (id: string | number) => {
        onSelect(id);
        lightFeedback();
      },
      [onSelect]
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          onPress={onClose}
        />
      ),
      [onClose]
    );

    const dynamicStyles = useMemo(
      () => ({
        bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
        indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
      }),
      [colors.elevation1, colors.modalIndicator]
    );

    if (!isVisible) {
      return null;
    }

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
        onClose={onClose}
        backgroundStyle={dynamicStyles.bottomSheet}
        handleIndicatorStyle={dynamicStyles.indicator}
        backdropComponent={renderBackdrop}
      >
        <BottomSheetView style={styles.container}>
          <View style={styles.header}>
            <ThemedText type="heading3" weight="bold">
              {title}
            </ThemedText>
          </View>

          <View style={styles.optionsContainer}>
            {options.map(option => {
              const isSelected = selectedValue === option.id;

              return (
                <BaseCard
                  key={option.id}
                  shadowSize="small"
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? colors.tintBackground : colors.elevation2,
                      borderColor: isSelected ? colors.tint : colors.borderOverlay,
                      borderWidth: LAYOUT.BORDER.WIDTH.THIN,
                    },
                  ]}
                  onPress={() => handleSelect(option.id)}
                >
                  <View style={styles.cardContent}>
                    <View style={styles.cardLeft}>
                      <View style={styles.cardIconContainer}>
                        <Ionicons
                          name={option.icon}
                          size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM}
                          color={colors.text}
                        />
                      </View>
                      <View style={styles.optionContent}>
                        <ThemedText
                          type="body"
                          weight="medium"
                          style={[
                            styles.optionTitle,
                            { color: isSelected ? colors.tint : colors.text },
                          ]}
                        >
                          {option.title}
                        </ThemedText>
                        <ThemedText
                          type="caption"
                          variant="secondary"
                          style={styles.optionSubtitle}
                        >
                          {option.subtitle}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </BaseCard>
              );
            })}
          </View>
        </BottomSheetView>
      </BottomSheet>
    );
  }
);

ThemedPicker.displayName = 'ThemedPicker';

const styles = StyleSheet.create({
  bottomSheet: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  indicator: {
    width: LAYOUT.BOTTOM_SHEET.INDICATOR.WIDTH,
    height: LAYOUT.BOTTOM_SHEET.INDICATOR.HEIGHT,
  },
  container: {
    paddingBottom: LAYOUT.SPACING.SMALL,
  },
  header: {
    ...LAYOUT.BOTTOM_SHEET.HEADER,
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  optionsContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  optionCard: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    marginBottom: 0,
    minHeight: MIN_TOUCH_TARGET.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.LARGE,
  },
  cardContent: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    flex: 1,
    paddingRight: LAYOUT.SPACING.SMALL,
  },
  cardIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.SPACING.SMALL,
  },
  optionContent: {
    flex: 1,
    marginLeft: LAYOUT.SPACING.SMALL,
  },
  optionTitle: {
    marginBottom: LAYOUT.SPACING.TINY,
  },
  optionSubtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * 1.3,
  },
});
