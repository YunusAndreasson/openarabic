import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedButton } from '@/components/ThemedButton';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

export type BottomControlsProps = {
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;

  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  secondaryDisabled?: boolean;
};

const BottomControls = memo<BottomControlsProps>(
  ({
    primaryLabel,
    onPrimaryPress,
    primaryDisabled = false,
    primaryLoading = false,
    secondaryLabel,
    onSecondaryPress,
    secondaryDisabled = false,
  }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();

    const hasSecondaryButton = Boolean(secondaryLabel && onSecondaryPress);

    const dynamicStyles = useMemo(
      () => ({
        secondaryButton: { shadowColor: colors.shadow },
      }),
      [colors.shadow]
    );

    return (
      <View
        style={[
          styles.container,
          {
            paddingBottom: insets.bottom || LAYOUT.SPACING.SMALL,
            backgroundColor: colors.background,
          },
        ]}
      >
        {/* Action buttons row */}
        <View style={styles.buttonsRow}>
          {hasSecondaryButton && (
            <View style={styles.buttonContainer}>
              <ThemedButton
                disabled={secondaryDisabled}
                title={secondaryLabel ?? ''}
                variant="outlined"
                style={[
                  styles.button,
                  styles.secondaryButton,
                  dynamicStyles.secondaryButton,
                  {
                    borderColor: colors.tint,
                    backgroundColor: colors.elevation1,
                  },
                ]}
                onPress={onSecondaryPress}
              />
            </View>
          )}
          <View
            style={hasSecondaryButton ? styles.buttonContainer : styles.fullWidthButtonContainer}
          >
            <ThemedButton
              disabled={primaryDisabled}
              loading={primaryLoading}
              style={styles.button}
              title={primaryLabel}
              onPress={onPrimaryPress}
              testID="primary-action-button"
            />
          </View>
        </View>
      </View>
    );
  }
);

BottomControls.displayName = 'BottomControls';

const styles = StyleSheet.create({
  button: {
    width: '100%',
  },
  buttonContainer: {
    width: `${LAYOUT.WIDTH_RATIOS.ALMOST_HALF * 100}%`,
  },
  buttonsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  fullWidthButtonContainer: {
    width: '100%',
  },
  secondaryButton: {
    // Intentionally empty – backgroundColor provided via theme at render time
  },
});

export default BottomControls;
