import { Ionicons } from '@expo/vector-icons';
import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
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
import { selectionFeedback } from '@/utils/haptics';

import { CustomSlider } from './Slider';
import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';

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
    initialHour = 12,
    initialMinute = 0,
    title = 'Set Time',
  }: TimePickerProps) => {
    const colors = useColors();
    const [selectedHour, setSelectedHour] = useState(initialHour);
    const [selectedMinute, setSelectedMinute] = useState(initialMinute);
    const screenHeight = Dimensions.get('window').height;

    const backdropOpacity = useSharedValue(0);
    const modalTranslateY = useSharedValue(screenHeight);
    const modalScale = useSharedValue(0.9);

    useEffect(() => {
      if (isVisible) {
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
        backdropOpacity.value = withTiming(0, { duration: 200 });
        modalTranslateY.value = withTiming(screenHeight, { duration: 200 });
        modalScale.value = withTiming(0.9, { duration: 200 });
      }
    }, [isVisible, backdropOpacity, modalTranslateY, modalScale, screenHeight]);

    const backdropStyle = useAnimatedStyle(() => ({
      opacity: backdropOpacity.value,
    }));

    const modalStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: modalTranslateY.value }, { scale: modalScale.value }],
    }));

    const handleHourChange = useCallback((value: number) => {
      const hour = Math.round(value);
      setSelectedHour(hour);
      selectionFeedback();
    }, []);

    const handleMinuteChange = useCallback((value: number) => {
      const minute = Math.round(value);
      setSelectedMinute(minute);
      selectionFeedback();
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
              <ThemedText
                type="heading3"
                weight="bold"
                colorName="headingText"
                style={styles.title}
              >
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
              <ThemedText
                type="heading1"
                weight="bold"
                colorName="subtitleText"
                style={styles.timeText}
              >
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
  actionButton: {
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
    justifyContent: 'space-between',
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  closeButton: {
    marginRight: -LAYOUT.SPACING.SMALL,
    padding: LAYOUT.SPACING.SMALL,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  modal: {
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    elevation: 16,
    padding: LAYOUT.SPACING.LARGE,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  modalContainer: {
    maxWidth: 400,
    width: '100%',
  },
  slider: {
    height: 40,
  },
  sliderHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  sliderLabel: {
    flex: 1,
  },
  sliderSection: {
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  sliderValue: {
    minWidth: 60,
    textAlign: 'right',
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
  title: {
    flex: 1,
  },
});
