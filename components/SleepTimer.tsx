import { Ionicons } from '@expo/vector-icons';
import React, { memo, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/useColors';
import { lightFeedback, selectionFeedback } from '@/utils/haptics';

import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';

export interface SleepTimerProps {
  isVisible: boolean;
  onClose: () => void;
  onTimerSet: (minutes: number) => void;
  onTimerCancel: () => void;
  remainingTime?: number; // in seconds
  isActive?: boolean;
}

const timerOptions = [5, 10, 15, 30, 45, 60]; // minutes

// Optimized time formatter - defined outside component to prevent recreation
const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds) || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const SleepTimerComponent = ({
  isVisible,
  onClose,
  onTimerSet,
  onTimerCancel,
  remainingTime = 0,
  isActive = false,
}: SleepTimerProps) => {
  const colors = useColors();
  const [selectedMinutes, setSelectedMinutes] = useState(15);
  const screenHeight = Dimensions.get('window').height;

  // Animation values
  const backdropOpacity = useSharedValue(0);
  const modalTranslateY = useSharedValue(screenHeight);
  const modalScale = useSharedValue(0.9);

  // Handle modal animations
  useEffect(() => {
    if (isVisible) {
      // Show modal
      backdropOpacity.value = withTiming(1, { duration: 300 });
      modalTranslateY.value = withSpring(0, {
        damping: 20,
        stiffness: 300,
      });
      modalScale.value = withSpring(1, {
        damping: 20,
        stiffness: 300,
      });
    } else {
      // Hide modal
      backdropOpacity.value = withTiming(0, { duration: 200 });
      modalTranslateY.value = withTiming(screenHeight, { duration: 200 });
      modalScale.value = withTiming(0.9, { duration: 200 });
    }
  }, [isVisible, backdropOpacity, modalTranslateY, modalScale, screenHeight]);

  // Animated styles
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }, { scale: modalScale.value }],
  }));

  const handleSetTimer = () => {
    lightFeedback(); // Keep for primary action
    onTimerSet(selectedMinutes);
    onClose();
  };

  const handleCancelTimer = () => {
    onTimerCancel();
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const handleBackdropPress = () => {
    handleClose();
  };

  const handleOptionSelect = (minutes: number) => {
    selectionFeedback();
    setSelectedMinutes(minutes);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <Animated.View
          style={[styles.backdrop, backdropStyle, { backgroundColor: colors.backdropOverlay }]}
        >
          <Animated.View style={[styles.modalContainer, modalStyle]} pointerEvents="box-none">
            <View
              style={[
                styles.modal,
                {
                  backgroundColor: colors.background,
                  shadowColor: colors.shadow,
                },
              ]}
              pointerEvents="auto"
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.borderOverlay }]}>
                <View style={styles.headerContent}>
                  <ThemedText type="heading2" weight="bold" style={styles.title}>
                    Sleep Timer
                  </ThemedText>
                  <ThemedText type="body" variant="secondary" style={styles.subtitle}>
                    {isActive && remainingTime > 0
                      ? 'Playback will stop automatically'
                      : 'Automatically stop playback after'}
                  </ThemedText>
                </View>
                <TouchableOpacity
                  onPress={handleClose}
                  style={styles.closeButton}
                  hitSlop={LAYOUT.HIT_SLOP.SMALL}
                  accessibilityRole="button"
                  accessibilityLabel="Close sleep timer"
                  accessibilityHint="Dismiss the sleep timer dialog"
                >
                  <Ionicons name="close" size={22} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.content}>
                {isActive && remainingTime > 0 ? (
                  <View style={styles.activeTimerContainer}>
                    <View style={styles.timeDisplay}>
                      <ThemedText type="heading1" style={[styles.timeText, { color: colors.tint }]}>
                        {formatTime(remainingTime)}
                      </ThemedText>
                    </View>
                    <ThemedText type="body" variant="secondary" style={styles.activeDescription}>
                      remaining
                    </ThemedText>
                    <ThemedButton
                      title="Cancel Timer"
                      onPress={handleCancelTimer}
                      variant="outlined"
                      style={[styles.cancelButton, { borderColor: colors.borderOverlay }]}
                    />
                  </View>
                ) : (
                  <View style={styles.setupContainer}>
                    <View style={styles.optionsGrid}>
                      {timerOptions.map(minutes => (
                        <ThemedButton
                          key={minutes}
                          title={`${minutes} min`}
                          onPress={() => handleOptionSelect(minutes)}
                          variant={selectedMinutes === minutes ? 'filled' : 'outlined'}
                          style={[
                            styles.optionButton,
                            selectedMinutes === minutes
                              ? {
                                  backgroundColor: colors.tint,
                                  borderColor: colors.tint,
                                }
                              : {
                                  borderColor: colors.borderOverlay,
                                  backgroundColor: colors.elevation1,
                                },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Set timer for ${minutes} minutes`}
                          accessibilityState={{ selected: selectedMinutes === minutes }}
                        />
                      ))}
                    </View>

                    <View style={styles.actionButtons}>
                      <ThemedButton
                        title="Cancel"
                        onPress={handleClose}
                        variant="outlined"
                        style={[styles.actionButton, { borderColor: colors.borderOverlay }]}
                      />
                      <ThemedButton
                        title="Set Timer"
                        onPress={handleSetTimer}
                        variant="filled"
                        style={styles.actionButton}
                      />
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

SleepTimerComponent.displayName = 'SleepTimer';

// Custom memo comparison for performance optimization
const arePropsEqual = (prevProps: SleepTimerProps, nextProps: SleepTimerProps): boolean => {
  // Always re-render if visibility changes
  if (prevProps.isVisible !== nextProps.isVisible) {
    return false;
  }

  // Always re-render if active state changes
  if (prevProps.isActive !== nextProps.isActive) {
    return false;
  }

  // Only update remaining time if difference is significant (> 1 second)
  const timeDiff = Math.abs((prevProps.remainingTime || 0) - (nextProps.remainingTime || 0));
  if (timeDiff > 1) {
    return false;
  }

  // All other props are the same, skip re-render
  return true;
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  activeDescription: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
  activeTimerContainer: {
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cancelButton: {
    width: '100%',
  },
  closeButton: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  content: {
    padding: LAYOUT.SPACING.LARGE + 4,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  header: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.LARGE + 4,
    paddingBottom: LAYOUT.SPACING.MEDIUM + 2,
  },
  headerContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  modal: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE + 4,
    elevation: LAYOUT.ELEVATION.MEDIUM + 2,
    maxHeight: '65%',
    overflow: 'hidden',
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: LAYOUT.OPACITY.LIGHT + 0.05,
    shadowRadius: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
  },
  optionButton: {
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM + 2,
    paddingVertical: LAYOUT.SPACING.MEDIUM + 2,
    width: `${LAYOUT.WIDTH_RATIOS.THIRD * 100 - 3}%`,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.SPACING.SMALL + 2,
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.XLARGE + 4,
  },
  setupContainer: {
    width: '100%',
  },
  subtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  timeText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.8,
    fontVariant: ['tabular-nums'],
    fontWeight: '300',
    letterSpacing: -0.5,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 2.2,
    textAlign: 'center',
  },
  title: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.2,
    marginBottom: LAYOUT.SPACING.XSMALL,
  },
});

// Apply custom comparison to the memoized component
const SleepTimer = memo(SleepTimerComponent, arePropsEqual);

export default SleepTimer;
