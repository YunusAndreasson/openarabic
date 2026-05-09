import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BaseCard } from '@/components/common/BaseCard';

import { ThemedText } from '@/components/ThemedText';
import { BrandedBottomSheetHandle } from '@/components/ui/BrandedBottomSheetHandle';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useBottomSheetDynamicStyles } from '@/hooks/ui/useBottomSheetDynamicStyles';
import { useBottomSheetModalVisibility } from '@/hooks/ui/useBottomSheetVisibility';
import { BottomSheetBackdrop, COMMON_BOTTOM_SHEET_MODAL_PROPS } from '@/utils/bottomSheetUtils';

export interface SettingsPickerOption<T> {
  id: T;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
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

  const bottomSheetRef = useBottomSheetModalVisibility(isVisible);

  // Use shared dynamic styles hook for theme-aware styling
  const dynamicStyles = useBottomSheetDynamicStyles();

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      {...COMMON_BOTTOM_SHEET_MODAL_PROPS}
      enableDynamicSizing={true}
      onDismiss={onClose}
      containerStyle={styles.modalContainer}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleComponent={BrandedBottomSheetHandle}
      backdropComponent={BottomSheetBackdrop}
    >
      <BottomSheetView>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="heading3" weight="bold" style={LAYOUT.BOTTOM_SHEET.STYLES.title}>
            {title}
          </ThemedText>
        </View>

        {/* Options */}
        <View
          style={[styles.optionsContainer, { paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE }]}
        >
          {options.map(option => {
            const isSelected = currentValue === option.id;

            return (
              <BaseCard
                key={String(option.id)}
                shadowSize="small"
                style={[
                  styles.optionCard,
                  {
                    backgroundColor: isSelected ? colors.tintBackground : colors.elevation2,
                    borderColor: isSelected ? colors.tint : colors.borderOverlay,
                    borderWidth: LAYOUT.BORDER.WIDTH.THIN,
                  },
                ]}
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
                        weight="medium"
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
                          variant="secondary"
                          style={styles.optionSubtitle}
                        >
                          {option.subtitle}
                        </ThemedText>
                      )}
                    </View>
                  </View>
                </View>
              </BaseCard>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

// Export component (memo not used for generic components)
export const SettingsPicker = SettingsPickerComponent;

const styles = StyleSheet.create({
  modalContainer: {
    zIndex: LAYOUT.Z_INDEX.MODAL, // Render above the MiniPlayer
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
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LINE_HEIGHT_MULTIPLIERS.NORMAL,
  },
});
