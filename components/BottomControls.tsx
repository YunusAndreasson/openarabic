import React, { memo } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  // Timer button props
  showTimerButton?: boolean;
  onTimerPress?: () => void;
  isTimerActive?: boolean;
  timerAccessibilityLabel?: string;
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
    showTimerButton,
    onTimerPress,
    isTimerActive,
    timerAccessibilityLabel,
  }: BottomControlsProps) => {
    const colors = useColors();

    return (
      <View style={[styles.bottomControlsContainer, { backgroundColor: colors.transparent }]}>
        <BaseCard style={styles.controlsCard} shadowSize="medium" includePressAnimation={false}>
          {/* Timer button row - only show when audio is playing */}
          {showTimerButton && onTimerPress && (
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
                activeOpacity={0.7}
                accessibilityLabel={timerAccessibilityLabel || 'Sleep timer'}
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

          {/* Main action buttons */}
          <View style={styles.actionButtonsRow}>
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
          </View>
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
  timerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.SMALL + 2,
  },
  timerButton: {
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM + 2,
    paddingVertical: LAYOUT.SPACING.SMALL - 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
