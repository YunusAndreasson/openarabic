import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';

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
  // Timer button props
  showTimerButton?: boolean;
  onTimerPress?: () => void;
  isTimerActive?: boolean;
  timerAccessibilityLabel?: string;
};

const BottomControls = memo<BottomControlsProps>(
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
    showTimerButton = false,
    onTimerPress,
    isTimerActive = false,
    timerAccessibilityLabel,
  }) => {
    const colors = useColors();
    const insets = useSafeAreaInsets();

    // Optimize gradient colors calculation
    const gradientColors = [
      colors.transparent,
      `${colors.background}40`,
      `${colors.background}80`,
      colors.background,
      colors.background,
    ] as const;

    const hasSecondaryButton = Boolean(secondaryLabel && onSecondaryPress);
    const hasTimerButton = showTimerButton && onTimerPress;

    return (
      <View style={styles.wrapper}>
        {/* Optimized gradient with calculated colors */}
        <LinearGradient
          colors={gradientColors}
          locations={[0, 0.3, 0.6, 0.8, 1]}
          style={styles.gradient}
        />

        <View
          style={[
            styles.container,
            { paddingBottom: Math.max(insets.bottom, LAYOUT.SPACING.SMALL) },
          ]}
        >
          {/* Timer button - conditionally rendered */}
          {hasTimerButton && (
            <View style={styles.timerRow}>
              <TouchableOpacity
                onPress={onTimerPress}
                style={[
                  styles.timerButton,
                  {
                    backgroundColor: isTimerActive ? colors.tint : colors.elevation1,
                    borderColor: isTimerActive ? colors.tint : colors.borderOverlay,
                  },
                ]}
                activeOpacity={LAYOUT.OPACITY.PRESSED}
                accessibilityLabel={timerAccessibilityLabel || 'Sleep timer'}
                accessibilityRole="button"
                accessibilityState={{ selected: isTimerActive }}
              >
                <Ionicons
                  name={isTimerActive ? 'timer' : 'timer-outline'}
                  size={18}
                  color={isTimerActive ? colors.background : colors.textTertiary}
                />
                <ThemedText
                  type="caption"
                  style={[
                    styles.timerLabel,
                    {
                      color: isTimerActive ? colors.background : colors.textTertiary,
                      fontWeight: isTimerActive ? '600' : '500',
                    },
                  ]}
                  skipDefaultColor
                >
                  Timer
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}

          {/* Action buttons row */}
          <View style={styles.buttonsRow}>
            {hasSecondaryButton && (
              <View style={styles.buttonContainer}>
                <ThemedButton
                  title={secondaryLabel!}
                  onPress={onSecondaryPress!}
                  variant={secondaryVariant}
                  style={[
                    styles.button,
                    styles.secondaryButton,
                    {
                      borderColor: colors.tint,
                      backgroundColor: colors.card, // Use theme-aware card background
                    },
                  ]}
                  disabled={secondaryDisabled}
                  accessibilityLabel={secondaryAccessibilityLabel || secondaryLabel!}
                />
              </View>
            )}
            <View style={styles.buttonContainer}>
              <ThemedButton
                title={primaryLabel}
                onPress={onPrimaryPress}
                variant={primaryVariant}
                style={styles.button}
                disabled={primaryDisabled}
                accessibilityLabel={primaryAccessibilityLabel || primaryLabel}
              />
            </View>
          </View>
        </View>
      </View>
    );
  }
);

BottomControls.displayName = 'BottomControls';

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: LAYOUT.BOTTOM_BAR.HEIGHT,
    left: 0,
    right: 0,
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  gradient: {
    position: 'absolute',
    top: -LAYOUT.SPACING.LARGE,
    left: 0,
    right: 0,
    bottom: -LAYOUT.BOTTOM_BAR.HEIGHT,
    height: 120,
  },
  container: {
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.TINY,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  buttonContainer: {
    width: `${LAYOUT.WIDTH_RATIOS.ALMOST_HALF * 100}%`,
  },
  button: {
    width: '100%',
  },
  secondaryButton: {
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  timerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingVertical: LAYOUT.SPACING.XSMALL + 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  timerLabel: {
    marginLeft: LAYOUT.SPACING.XSMALL - 1,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL - 1,
    letterSpacing: 0.2,
  },
});

export default BottomControls;
