import React, { memo, useState, useCallback, useMemo } from 'react';
import { StyleSheet, View, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
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
import { CustomSlider } from './Slider';

export interface TimePickerProps {
  isVisible: boolean;
  onClose: () => void;
  onTimeSet: (hour: number, minute: number) => void;
  initialHour?: number;
  initialMinute?: number;
  title?: string;
}

export const TimePicker = memo(
  ({
    isVisible,
    onClose,
    onTimeSet,
    initialHour = 19,
    initialMinute = 0,
    title = 'Set Reminder Time',
  }: TimePickerProps) => {
    const colors = useColors();
    const [selectedHour, setSelectedHour] = useState(initialHour);
    const [selectedMinute, setSelectedMinute] = useState(initialMinute);

    const backdropOpacity = useSharedValue(0);
    const modalScale = useSharedValue(0.9);

    const backdropStyle = useAnimatedStyle(() => ({
      opacity: backdropOpacity.value,
    }));

    const modalStyle = useAnimatedStyle(() => ({
      transform: [{ scale: modalScale.value }],
    }));

    React.useEffect(() => {
      if (isVisible) {
        backdropOpacity.value = withTiming(1, { duration: 200 });
        modalScale.value = withSpring(1, { damping: 15, stiffness: 200 });
      } else {
        backdropOpacity.value = withTiming(0, { duration: 150 });
        modalScale.value = withTiming(0.9, { duration: 150 });
      }
    }, [isVisible, backdropOpacity, modalScale]);

    const handleHourChange = useCallback((value: number) => {
      const hour = Math.round(value);
      setSelectedHour(hour);
      lightFeedback();
    }, []);

    const handleMinuteChange = useCallback((value: number) => {
      const minute = Math.round(value);
      setSelectedMinute(minute);
      lightFeedback();
    }, []);

    const handleConfirm = useCallback(() => {
      onTimeSet(selectedHour, selectedMinute);
      onClose();
    }, [selectedHour, selectedMinute, onTimeSet, onClose]);

    const formatTime = useCallback((hour: number, minute: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayMinute = minute.toString().padStart(2, '0');
      return `${displayHour}:${displayMinute} ${period}`;
    }, []);

    const modalContent = useMemo(
      () => (
        <Animated.View style={[styles.modalContainer, modalStyle]}>
          <View
            style={[styles.modal, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
          >
            {/* Header */}
            <View style={styles.header}>
              <ThemedText type="heading3" weight="bold" style={styles.title}>
                {title}
              </ThemedText>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                accessibilityRole="button"
                accessibilityLabel="Close time picker"
                accessibilityHint="Cancel time selection and close dialog"
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Time Display */}
            <View style={styles.timeDisplay}>
              <ThemedText type="heading1" weight="bold" style={styles.timeText}>
                {formatTime(selectedHour, selectedMinute)}
              </ThemedText>
            </View>

            {/* Hour Slider */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <ThemedText type="body" weight="medium" style={styles.sliderLabel}>
                  Hour
                </ThemedText>
                <ThemedText type="body" variant="secondary" style={styles.sliderValue}>
                  {selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour}{' '}
                  {selectedHour >= 12 ? 'PM' : 'AM'}
                </ThemedText>
              </View>
              <CustomSlider
                value={selectedHour}
                onValueChange={handleHourChange}
                minimumValue={0}
                maximumValue={23}
                step={1}
                style={styles.slider}
              />
            </View>

            {/* Minute Slider */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <ThemedText type="body" weight="medium" style={styles.sliderLabel}>
                  Minute
                </ThemedText>
                <ThemedText type="body" variant="secondary" style={styles.sliderValue}>
                  {selectedMinute.toString().padStart(2, '0')}
                </ThemedText>
              </View>
              <CustomSlider
                value={selectedMinute}
                onValueChange={handleMinuteChange}
                minimumValue={0}
                maximumValue={59}
                step={5}
                style={styles.slider}
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <ThemedButton
                title="Cancel"
                onPress={onClose}
                variant="outlined"
                style={styles.actionButton}
              />
              <ThemedButton title="Set Time" onPress={handleConfirm} style={styles.actionButton} />
            </View>
          </View>
        </Animated.View>
      ),
      [
        colors,
        title,
        selectedHour,
        selectedMinute,
        formatTime,
        handleHourChange,
        handleMinuteChange,
        handleConfirm,
        onClose,
        modalStyle,
      ]
    );

    if (!isVisible) return null;

    return (
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[styles.backdrop, backdropStyle, { backgroundColor: colors.modalOverlay }]}
          >
            <TouchableWithoutFeedback>{modalContent}</TouchableWithoutFeedback>
          </Animated.View>
        </TouchableWithoutFeedback>
      </Modal>
    );
  }
);

TimePicker.displayName = 'TimePicker';

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
  },
  modal: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    padding: LAYOUT.SPACING.LARGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  title: {
    flex: 1,
  },
  closeButton: {
    padding: LAYOUT.SPACING.SMALL,
    marginRight: -LAYOUT.SPACING.SMALL,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.XLARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  timeText: {
    fontSize: 48,
    lineHeight: 56,
  },
  sliderSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  sliderLabel: {
    flex: 1,
  },
  sliderValue: {
    minWidth: 60,
    textAlign: 'right',
  },
  slider: {
    height: 40,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: LAYOUT.SPACING.MEDIUM,
    gap: LAYOUT.SPACING.MEDIUM,
  },
  actionButton: {
    flex: 1,
  },
});
