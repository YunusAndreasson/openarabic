import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useState } from 'react';
import { StyleSheet, View, Modal, TouchableWithoutFeedback, TouchableOpacity } from 'react-native';

import { ThemedButton } from '@/components/ThemedButton';
import { ThemedText } from '@/components/ThemedText';
import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

export interface SleepTimerProps {
  isVisible: boolean;
  onClose: () => void;
  onTimerSet: (minutes: number) => void;
  onTimerCancel: () => void;
  remainingTime?: number; // in seconds
  isActive?: boolean;
}

const timerOptions = [5, 10, 15, 30, 45, 60]; // minutes

// Simplified time formatter
const formatTime = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00';

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
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);

  const handleSetTimer = () => {
    if (selectedMinutes) {
      onTimerSet(selectedMinutes);
      onClose();
    }
  };

  const handleCancelTimer = () => {
    onTimerCancel();
    onClose();
  };

  const handleOptionSelect = useCallback((minutes: number) => {
    setSelectedMinutes(minutes);
  }, []);

  const handleOptionSelectCallback = useCallback(
    (minutes: number) => () => handleOptionSelect(minutes),
    [handleOptionSelect]
  );

  return (
    <Modal
      statusBarTranslucent
      transparent
      animationType="slide"
      visible={isVisible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { backgroundColor: colors.backdropOverlay }]}>
          <View style={styles.modalContainer}>
            <View
              style={[
                styles.modal,
                {
                  backgroundColor: colors.background,
                  shadowColor: colors.shadow,
                },
              ]}
            >
              {/* Header */}
              <View style={[styles.header, { borderBottomColor: colors.borderOverlay }]}>
                <View style={styles.headerContent}>
                  <ThemedText style={styles.title} type="heading2" weight="bold">
                    Sleep Timer
                  </ThemedText>
                  <ThemedText style={styles.subtitle} type="body" variant="secondary">
                    {isActive && remainingTime > 0
                      ? 'Playback will stop automatically'
                      : 'Choose when to stop playback'}
                  </ThemedText>
                </View>
                <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
              </View>

              {/* Content */}
              <View style={styles.content}>
                {isActive && remainingTime > 0 ? (
                  <View style={styles.activeTimerContainer}>
                    <View style={styles.timeDisplay}>
                      <ThemedText colorName="tint" style={styles.timeText} type="heading1">
                        {formatTime(remainingTime)}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.activeDescription} type="body" variant="secondary">
                      remaining
                    </ThemedText>
                    <ThemedButton
                      style={[styles.fullWidthButton, { borderColor: colors.borderOverlay }]}
                      title="Cancel Timer"
                      variant="outlined"
                      onPress={handleCancelTimer}
                    />
                  </View>
                ) : (
                  <>
                    <View style={styles.optionsGrid}>
                      {timerOptions.map(minutes => (
                        <ThemedButton
                          key={minutes}
                          title={`${minutes} min`}
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
                          onPress={handleOptionSelectCallback(minutes)}
                        />
                      ))}
                    </View>

                    <ThemedButton
                      style={styles.fullWidthButton}
                      title="Start Timer"
                      variant="filled"
                      onPress={handleSetTimer}
                    />
                  </>
                )}
              </View>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Simplified memo comparison
const arePropsEqual = (prevProps: SleepTimerProps, nextProps: SleepTimerProps): boolean => {
  return (
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.isActive === nextProps.isActive &&
    Math.abs((prevProps.remainingTime ?? 0) - (nextProps.remainingTime ?? 0)) <= 1
  );
};

const styles = StyleSheet.create({
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
  closeButton: {
    padding: LAYOUT.SPACING.SMALL,
  },
  content: {
    padding: LAYOUT.SPACING.LARGE,
  },
  fullWidthButton: {
    width: '100%',
  },
  header: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
  },
  headerContent: {
    flex: 1,
  },
  modal: {
    ...LAYOUT.ELEVATION.LARGE,
    shadowOffset: {
      width: 0,
      height: -8,
    },
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    maxHeight: '65%',
    overflow: 'hidden',
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
    marginBottom: LAYOUT.SPACING.XLARGE,
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
    marginBottom: LAYOUT.SPACING.SMALL,
  },
});

const SleepTimer = memo(SleepTimerComponent, arePropsEqual);

export default SleepTimer;
