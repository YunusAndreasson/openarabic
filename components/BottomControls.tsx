import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import BaseCard from './BaseCard';
import { ThemedButton } from './ThemedButton';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { ThemedText } from './ThemedText';

export type BottomControlsProps = {
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryVariant?: 'filled' | 'outlined';
  primaryDisabled?: boolean;
  primaryAccessibilityLabel?: string;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  secondaryVariant?: 'filled' | 'outlined';
  secondaryDisabled?: boolean;
  secondaryAccessibilityLabel?: string;
  showWarning?: boolean;
  warningText?: string;
};

const BottomControls = memo(
  ({
    primaryLabel,
    onPrimaryPress,
    primaryVariant = 'filled',
    primaryDisabled = false,
    primaryAccessibilityLabel,
    secondaryLabel,
    onSecondaryPress,
    secondaryVariant = 'outlined',
    secondaryDisabled = false,
    secondaryAccessibilityLabel,
    showWarning = false,
    warningText,
  }: BottomControlsProps) => {
    const colors = useColors();

    return (
      <View style={[styles.bottomControlsContainer, { backgroundColor: colors.transparent }]}>
        <BaseCard style={styles.controlsCard} shadowSize="medium" includePressAnimation={false}>
          <View style={styles.actionButtonsRow}>
            <View style={styles.buttonContainer}>
              <ThemedButton
                title={primaryLabel}
                onPress={onPrimaryPress}
                variant={primaryVariant}
                style={styles.fullWidthButton}
                disabled={primaryDisabled}
                accessibilityLabel={primaryAccessibilityLabel || primaryLabel}
              />
            </View>
            {secondaryLabel && onSecondaryPress && (
              <View style={styles.buttonContainer}>
                <ThemedButton
                  title={secondaryLabel}
                  onPress={onSecondaryPress}
                  variant={secondaryVariant}
                  style={[
                    styles.fullWidthButton,
                    styles.secondaryButton,
                    { borderColor: colors.tint },
                  ]}
                  disabled={secondaryDisabled}
                  accessibilityLabel={secondaryAccessibilityLabel || secondaryLabel}
                />
              </View>
            )}
          </View>
          {showWarning && warningText ? (
            <View style={styles.warningContainer}>
              <ThemedText type="label" variant="warning" style={styles.warningText}>
                {warningText}
              </ThemedText>
            </View>
          ) : null}
        </BaseCard>
      </View>
    );
  }
);

BottomControls.displayName = 'BottomControls';

const styles = StyleSheet.create({
  bottomControlsContainer: {
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT + LAYOUT.SPACING.MEDIUM,
    left: LAYOUT.SCREEN_EDGE_PADDING,
    position: 'absolute',
    right: LAYOUT.SCREEN_EDGE_PADDING,
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  controlsCard: {
    padding: LAYOUT.SPACING.MEDIUM,
    width: '100%',
  },
  actionButtonsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonContainer: {
    width: `${LAYOUT.WIDTH_RATIOS.ALMOST_HALF * 100}%`,
  },
  fullWidthButton: {
    width: '100%',
  },
  secondaryButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  warningContainer: {
    marginTop: LAYOUT.SPACING.SMALL,
    width: '100%',
    alignItems: 'center',
  },
  warningText: {
    marginTop: LAYOUT.SPACING.SMALL,
    textAlign: 'center',
  },
});

export default BottomControls;
