import { Ionicons } from '@expo/vector-icons';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import BaseCard from '@common/BaseCard';

import { ThemedText } from '@/components/ThemedText';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useAppDispatch, useAppSelectorMemo } from '@/store/hooks';
import { lightFeedback } from '@/utils/haptics';

// Default snap points for settings pickers
const DEFAULT_SNAP_POINTS = [320];

export interface SettingsPickerOption<T> {
  id: T;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface SettingsPickerProps<T> {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  options: SettingsPickerOption<T>[];
  currentValueSelector: (state: RootState) => T;
  onValueChange: (value: T) => any;
  snapPoints?: number[];
  supportsOptimisticUpdates?: boolean;
}

type RootState = {
  theme: { theme: any };
  settings: { displayLanguagePreference: any; audioLanguagePreference: any };
  [key: string]: any;
};

export const SettingsPicker = <T,>({
  isVisible,
  onClose,
  title,
  options,
  currentValueSelector,
  onValueChange,
  snapPoints = DEFAULT_SNAP_POINTS,
  supportsOptimisticUpdates = false,
}: SettingsPickerProps<T>) => {
  const colors = useColors();
  const dispatch = useAppDispatch();
  const currentValue = useAppSelectorMemo(currentValueSelector);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const [optimisticValue, setOptimisticValue] = React.useState(currentValue);

  // Show/hide modal based on isVisible prop
  useEffect(() => {
    if (isVisible) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isVisible]);

  // Sync optimistic value with actual value when it changes
  React.useEffect(() => {
    if (!supportsOptimisticUpdates) {
      setOptimisticValue(currentValue);
    }
  }, [currentValue, supportsOptimisticUpdates]);

  const handleValueSelect = useCallback(
    (value: T) => {
      if (supportsOptimisticUpdates) {
        setOptimisticValue(value); // Immediate visual feedback
      }
      dispatch(onValueChange(value));
      lightFeedback();
    },
    [dispatch, onValueChange, supportsOptimisticUpdates]
  );

  // Use built-in backdrop component
  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} onPress={onClose} />
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

  // Only render when visible
  if (!isVisible) {
    return null;
  }

  const displayValue = supportsOptimisticUpdates ? optimisticValue : currentValue;

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
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="heading3" weight="bold">
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
                      <ThemedText type="caption" variant="secondary" style={styles.optionSubtitle}>
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
};

const styles = StyleSheet.create({
  bottomSheet: {
    ...LAYOUT.ELEVATION.LARGE,
    borderTopLeftRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    borderTopRightRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  indicator: {
    // Styling handled via dynamicStyles
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
