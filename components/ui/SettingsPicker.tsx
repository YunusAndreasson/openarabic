import { BaseCard } from '@/components/common';
import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { startTransition, useCallback, useEffect, useMemo, useOptimistic, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import type { RootState } from '@/store/store';
import { lightFeedback } from '@/utils/haptics';

// Default snap points for settings pickers
const DEFAULT_SNAP_POINTS = [320];

export interface SettingsPickerOption<T> {
  id: T;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * Props for SettingsPicker with Redux integration
 */
export interface SettingsPickerReduxProps<T> {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  options: SettingsPickerOption<T>[];
  /** Redux selector for current value - mutually exclusive with selectedValue */
  currentValueSelector: (state: RootState) => T;
  /** Redux action creator - mutually exclusive with onSelect */
  onValueChange: (value: T) => { type: string; payload: T };
  snapPoints?: number[];
  supportsOptimisticUpdates?: boolean;
  /** Controlled mode is disabled when using Redux */
  selectedValue?: never;
  onSelect?: never;
}

/**
 * Props for SettingsPicker in controlled mode (without Redux)
 */
export interface SettingsPickerControlledProps<T> {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  options: SettingsPickerOption<T>[];
  /** Currently selected value - mutually exclusive with currentValueSelector */
  selectedValue?: T;
  /** Selection callback - mutually exclusive with onValueChange */
  onSelect: (value: T) => void;
  snapPoints?: number[];
  supportsOptimisticUpdates?: boolean;
  /** Redux mode is disabled when using controlled mode */
  currentValueSelector?: never;
  onValueChange?: never;
}

export type SettingsPickerProps<T> = SettingsPickerReduxProps<T> | SettingsPickerControlledProps<T>;

export const SettingsPicker = <T,>({
  isVisible,
  onClose,
  title,
  options,
  currentValueSelector,
  onValueChange,
  selectedValue,
  onSelect,
  snapPoints = DEFAULT_SNAP_POINTS,
  supportsOptimisticUpdates = false,
}: SettingsPickerProps<T>) => {
  const colors = useColors();
  const dispatch = useAppDispatch();

  // Determine if we're in Redux mode or controlled mode
  const isReduxMode = Boolean(currentValueSelector && onValueChange);
  const isControlledMode = Boolean(onSelect);

  // Get current value from Redux (always call hook, but provide fallback)
  const reduxValue = useAppSelectorShallow(currentValueSelector || (() => undefined as T));

  // Get the current value - with proper fallback to first option if undefined
  const rawCurrentValue = isReduxMode ? reduxValue : selectedValue;
  const currentValue = useMemo(() => {
    // If we have a value, use it
    if (rawCurrentValue !== undefined && rawCurrentValue !== null) {
      return rawCurrentValue;
    }
    // Otherwise, fall back to the first option's id
    return options[0]?.id;
  }, [rawCurrentValue, options]);

  const bottomSheetRef = useRef<BottomSheet>(null);

  // React 19: Use native useOptimistic for immediate visual feedback
  const [optimisticValue, setOptimisticValue] = useOptimistic(
    currentValue,
    (_currentState, newValue: T) => newValue,
  );
  // Conditional optimistic behavior - only show optimistic value when enabled
  const displayValue = supportsOptimisticUpdates ? optimisticValue : currentValue;

  // Show/hide modal based on isVisible prop
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  // Handle sheet position changes - sync parent state when dismissed via gesture
  const handleChange = useCallback(
    (index: number) => {
      if (index === -1) {
        onClose();
      }
    },
    [onClose],
  );

  const handleValueSelect = useCallback(
    (value: T) => {
      // React 19: Optimistic update in transition for immediate UI feedback
      startTransition(() => {
        setOptimisticValue(value);
      });

      // Execute other operations immediately (not in transition)
      if (isReduxMode && onValueChange) {
        dispatch(onValueChange(value));
      } else if (isControlledMode && onSelect) {
        onSelect(value);
      }

      lightFeedback();
    },
    [dispatch, onValueChange, onSelect, setOptimisticValue, isReduxMode, isControlledMode],
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

  const dynamicStyles = useMemo(
    () => ({
      bottomSheet: [styles.bottomSheet, { backgroundColor: colors.elevation1 }],
      indicator: [styles.indicator, { backgroundColor: colors.modalIndicator }],
    }),
    [colors.elevation1, colors.modalIndicator],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableOverDrag={false}
      enableDynamicSizing={false}
      animateOnMount={true}
      activeOffsetY={[-10, 10]}
      onChange={handleChange}
      onClose={onClose}
      backgroundStyle={dynamicStyles.bottomSheet}
      handleIndicatorStyle={dynamicStyles.indicator}
      backdropComponent={renderBackdrop}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="heading3" weight="bold" style={LAYOUT.BOTTOM_SHEET.STYLES.title}>
            {title}
          </ThemedText>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {options.map(option => {
            const isSelected = displayValue === option.id;

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
                onPress={() => handleValueSelect(option.id)}
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
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  bottomSheet: LAYOUT.BOTTOM_SHEET.STYLES.bottomSheet,
  indicator: LAYOUT.BOTTOM_SHEET.STYLES.indicator,
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
