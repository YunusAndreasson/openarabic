import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

export type BottomControlsProps = {
  primaryLabel: string;
  onPrimaryPress: () => void;
  onPrimaryLongPress?: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;

  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  secondaryDisabled?: boolean;
};

export const BottomControls = memo<BottomControlsProps>(
  ({
    primaryLabel,
    onPrimaryPress,
    onPrimaryLongPress,
    primaryDisabled = false,
    primaryLoading = false,
    secondaryLabel,
    onSecondaryPress,
    secondaryDisabled = false,
  }) => {
    const colors = useColors();

    const hasSecondaryButton = Boolean(secondaryLabel && onSecondaryPress);

    const dynamicStyles = useMemo(
      () => ({
        secondaryButton: {
          shadowColor: colors.shadow,
          borderColor: colors.tint,
          backgroundColor: colors.elevation1,
        },
        primaryButton: {
          shadowColor: colors.shadow,
        },
      }),
      [colors.shadow, colors.tint, colors.elevation1],
    );

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.elevation0,
          },
        ]}
      >
        {/* Action buttons - stacked vertically when secondary exists, primary at bottom for thumb reach */}
        <View style={hasSecondaryButton ? styles.buttonsColumn : styles.buttonsRow}>
          {hasSecondaryButton && (
            <View style={styles.fullWidthButtonContainer}>
              <ThemedButton
                disabled={secondaryDisabled}
                title={secondaryLabel ?? ''}
                variant="outlined"
                style={[
                  styles.button,
                  styles.secondaryButton,
                  LAYOUT.ELEVATION.MEDIUM,
                  dynamicStyles.secondaryButton,
                ]}
                onPress={onSecondaryPress}
              />
            </View>
          )}
          <View style={styles.fullWidthButtonContainer}>
            <ThemedButton
              disabled={primaryDisabled}
              loading={primaryLoading}
              style={[styles.button, LAYOUT.ELEVATION.MEDIUM, dynamicStyles.primaryButton]}
              title={primaryLabel}
              onPress={onPrimaryPress}
              onLongPress={onPrimaryLongPress}
              delayLongPress={500}
              enableOptimisticLoading={primaryLabel === 'PLAY ALL'}
              testID="primary-action-button"
            />
          </View>
        </View>
      </View>
    );
  },
);

BottomControls.displayName = 'BottomControls';

const styles = StyleSheet.create({
  button: {
    width: '100%',
  },
  buttonsColumn: {
    alignItems: 'center',
    gap: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
  buttonsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  container: {
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    // No bottom padding - button sits lower
  },
  fullWidthButtonContainer: {
    width: '100%',
  },
  secondaryButton: {
    // Intentionally empty – backgroundColor provided via theme at render time
  },
});
