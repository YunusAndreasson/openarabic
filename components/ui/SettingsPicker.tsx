import { BrandedBottomSheet } from '@/components/ui/BrandedBottomSheet';
import { Icon, type IconName } from '@/components/ui/Icon';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheetHeader } from '@/components/common/BottomSheetHeader';
import { OptionCard } from '@/components/common/OptionCard';
import { ThemedText } from '@/components/primitives/ThemedText';
import { LAYOUT, LINE_HEIGHT_MULTIPLIERS, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

export interface SettingsPickerOption<T> {
  id: T;
  title: string;
  subtitle?: string;
  icon: IconName;
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

  return (
    <BrandedBottomSheet isVisible={isVisible} onClose={onClose}>
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
                      <Icon
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
    </BrandedBottomSheet>
  );
}

// Export component (memo not used for generic components)
export const SettingsPicker = SettingsPickerComponent;

const styles = StyleSheet.create({
  optionsContainer: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  // OptionCard's BaseCard supplies the radius; this is only its box.
  optionCard: {
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
