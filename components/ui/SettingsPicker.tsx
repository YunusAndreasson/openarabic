import { BrandedBottomSheetHandle } from '@/components/ui/BrandedBottomSheetHandle';
import { Ionicons, type IoniconName } from '@/components/ui/Icon';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheetHeader } from '@/components/common/BottomSheetHeader';
import { OptionCard } from '@/components/common/OptionCard';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useBottomSheetDynamicStyles } from '@/hooks/ui/useBottomSheetDynamicStyles';
import { useBottomSheetVisibility } from '@/hooks/ui/useBottomSheetVisibility';
import { BottomSheetBackdrop, COMMON_BOTTOM_SHEET_PROPS } from '@/utils/bottomSheetUtils';

export interface SettingsPickerOption<T> {
  id: T;
  title: string;
  subtitle?: string;
  icon: IoniconName;
}

export interface SettingsPickerProps<T> {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  options: SettingsPickerOption<T>[];
  /** Currently selected value */
  selectedValue?: T;
  /** Selection callback */
  onSelect: (value: T) => void;
}

function SettingsPickerComponent<T>({
  isVisible,
  onClose,
  title,
  options,
  selectedValue,
  onSelect,
}: SettingsPickerProps<T>) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // Get the current value - with proper fallback to first option if undefined
  const currentValue =
    selectedValue !== undefined && selectedValue !== null ? selectedValue : options[0]?.id;

  const bottomSheetRef = useBottomSheetVisibility(isVisible);

  // Use shared dynamic styles hook for theme-aware styling
  const dynamicStyles = useBottomSheetDynamicStyles();

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      {...COMMON_BOTTOM_SHEET_PROPS}
      enableDynamicSizing={true}
      onClose={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleComponent={BrandedBottomSheetHandle}
      backdropComponent={BottomSheetBackdrop}
    >
      <BottomSheetView>
        <BottomSheetHeader title={title} />

        {/* Options */}
        <View
          style={[styles.optionsContainer, { paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE }]}
        >
          {options.map(option => {
            const isSelected = currentValue === option.id;

            return (
              <OptionCard
                key={String(option.id)}
                accessibilityLabel={
                  option.subtitle ? `${option.title}. ${option.subtitle}` : option.title
                }
                selected={isSelected}
                style={styles.optionCard}
                onPress={() => onSelect(option.id)}
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
                        style={[
                          styles.optionTitle,
                          { color: isSelected ? colors.tint : colors.text },
                        ]}
                      >
                        {option.title}
                      </ThemedText>
                      {option.subtitle && (
                        <ThemedText
                          type="caption"
                          colorName="secondaryText"
                          style={styles.optionSubtitle}
                        >
                          {option.subtitle}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                </View>
              </OptionCard>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

// Export component (memo not used for generic components)
export const SettingsPicker = SettingsPickerComponent;

const styles = StyleSheet.create({
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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.NORMAL,
  },
});
