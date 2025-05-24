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
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './ThemedText';
import { ThemedButton } from './ThemedButton';
import { useColors } from '@/hooks/useColors';
import { LAYOUT } from '@/constants/layout';
import { lightFeedback } from '@/utils/haptics';

export interface SleepTimerProps {
  isVisible: boolean;
  onClose: () => void;
  onTimerSet: (minutes: number) => void;
  onTimerCancel: () => void;
  remainingTime?: number; // in seconds
  isActive?: boolean;
}

const timerOptions = [5, 10, 15, 30, 45, 60]; // minutes

const SleepTimer = memo(
  ({
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

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSetTimer = () => {
      lightFeedback();
      onTimerSet(selectedMinutes);
      onClose();
    };

    const handleCancelTimer = () => {
      lightFeedback();
      onTimerCancel();
      onClose();
    };

    const handleClose = () => {
      lightFeedback();
      onClose();
    };

    const handleBackdropPress = () => {
      handleClose();
    };

    const handleOptionSelect = (minutes: number) => {
      lightFeedback();
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
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close" size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <View style={styles.content}>
                  {isActive && remainingTime > 0 ? (
                    <View style={styles.activeTimerContainer}>
                      <View style={styles.timeDisplay}>
                        <ThemedText
                          type="heading1"
                          style={[styles.timeText, { color: colors.tint }]}
                        >
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
  }
);

SleepTimer.displayName = 'SleepTimer';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: LAYOUT.SPACING.MEDIUM,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  modal: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE + 4,
    maxHeight: '65%',
    shadowOffset: {
      width: 0,
      height: -8,
    },
    shadowOpacity: LAYOUT.OPACITY.LIGHT + 0.05,
    shadowRadius: 16,
    elevation: LAYOUT.ELEVATION.MEDIUM + 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.LARGE + 4,
    paddingBottom: LAYOUT.SPACING.MEDIUM + 2,
    borderBottomWidth: 1,
  },
  headerContent: {
    flex: 1,
    marginRight: LAYOUT.SPACING.MEDIUM,
  },
  title: {
    marginBottom: LAYOUT.SPACING.XSMALL,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.2,
  },
  subtitle: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.MEDIUM * 1.4,
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: LAYOUT.SPACING.LARGE + 4,
    paddingTop: LAYOUT.SPACING.LARGE,
  },
  activeTimerContainer: {
    alignItems: 'center',
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  timeText: {
    fontVariant: ['tabular-nums'],
    fontWeight: '300',
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.8,
    letterSpacing: -0.5,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 2.2,
    textAlign: 'center',
  },
  cancelButton: {
    width: '100%',
  },
  setupContainer: {
    width: '100%',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.XLARGE + 4,
    gap: LAYOUT.SPACING.SMALL + 2,
  },
  optionButton: {
    width: `${LAYOUT.WIDTH_RATIOS.THIRD * 100 - 3}%`,
    paddingVertical: LAYOUT.SPACING.MEDIUM + 2,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM + 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
  },
  actionButton: {
    flex: 1,
  },
  activeDescription: {
    marginBottom: LAYOUT.SPACING.SMALL,
  },
});

export default SleepTimer;
