import DateTimePicker from '@react-native-community/datetimepicker';
import React, { memo, useState, useCallback, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet, View, Modal, TouchableWithoutFeedback, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';
import { useIsDarkMode } from '@/hooks/theme/useThemeDetection';

import { ThemedButton } from './ThemedButton';
import { ThemedText } from './ThemedText';

const ANIMATION_DURATION = 200;
const SPRING_CONFIG = { damping: 20, stiffness: 300 };

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
    const isDarkMode = useIsDarkMode();

    // Create initial date from hour and minute
    const initialDate = useMemo(() => {
      const date = new Date();
      date.setHours(initialHour, initialMinute, 0, 0);
      return date;
    }, [initialHour, initialMinute]);

    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [showPicker, setShowPicker] = useState(false);

    // Animation values
    const backdropOpacity = useSharedValue(0);
    const modalScale = useSharedValue(0.9);
    const modalTranslateY = useSharedValue(50);

    // Animated styles
    const backdropStyle = useAnimatedStyle(() => ({
      opacity: backdropOpacity.value,
    }));

    const modalStyle = useAnimatedStyle(() => ({
      transform: [{ scale: modalScale.value }, { translateY: modalTranslateY.value }],
    }));

    // Animation functions
    const showModal = useCallback(() => {
      backdropOpacity.value = withTiming(1, { duration: ANIMATION_DURATION });
      modalScale.value = withSpring(1, SPRING_CONFIG);
      modalTranslateY.value = withSpring(0, SPRING_CONFIG);
    }, [backdropOpacity, modalScale, modalTranslateY]);

    const hideModal = useCallback(() => {
      backdropOpacity.value = withTiming(0, { duration: ANIMATION_DURATION });
      modalScale.value = withTiming(0.9, { duration: ANIMATION_DURATION });
      modalTranslateY.value = withTiming(50, { duration: ANIMATION_DURATION }, () => {
        runOnJS(onClose)();
      });
    }, [backdropOpacity, modalScale, modalTranslateY, onClose]);

    // Show modal when visible
    React.useEffect(() => {
      if (isVisible) {
        setShowPicker(Platform.OS === 'ios');
        showModal();
      }
    }, [isVisible, showModal]);

    const extractTimeAndSet = useCallback(
      (date: Date) => {
        const hour = date.getHours();
        const minute = date.getMinutes();
        onTimeSet(hour, minute);
      },
      [onTimeSet]
    );

    const handleDateChange = useCallback(
      (event: any, date?: Date) => {
        if (Platform.OS === 'android') {
          setShowPicker(false);

          if (event.type === 'set' && date) {
            setSelectedDate(date);
            extractTimeAndSet(date);
          }
          hideModal();
        } else if (date) {
          setSelectedDate(date);
        }
      },
      [extractTimeAndSet, hideModal]
    );

    const handleConfirm = useCallback(() => {
      extractTimeAndSet(selectedDate);
      hideModal();
    }, [selectedDate, extractTimeAndSet, hideModal]);

    const handleCancel = useCallback(() => {
      hideModal();
    }, [hideModal]);

    const formatTime = useCallback((date: Date) => {
      const hour = date.getHours();
      const minute = date.getMinutes();
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const displayMinute = minute.toString().padStart(2, '0');
      return `${displayHour}:${displayMinute} ${period}`;
    }, []);

    if (!isVisible) return null;

    // Android: Show native picker directly
    if (Platform.OS === 'android' && showPicker) {
      return (
        <DateTimePicker
          value={selectedDate}
          mode="time"
          is24Hour={false}
          display="default"
          onChange={handleDateChange}
        />
      );
    }

    // iOS: Show custom modal with native picker
    return (
      <Modal
        statusBarTranslucent
        transparent
        animationType="none"
        visible={isVisible}
        onRequestClose={handleCancel}
      >
        <TouchableWithoutFeedback onPress={handleCancel}>
          <Animated.View
            style={[
              styles.backdrop,
              backdropStyle as ViewStyle,
              { backgroundColor: colors.modalOverlay },
            ]}
          >
            <TouchableWithoutFeedback>
              <Animated.View style={[styles.modalContainer, modalStyle]}>
                <View
                  style={[
                    styles.modal,
                    {
                      backgroundColor: colors.card,
                      shadowColor: colors.shadow,
                    },
                  ]}
                >
                  {/* Header */}
                  <View style={styles.header}>
                    <ThemedText
                      colorName="headingText"
                      style={styles.title}
                      type="heading3"
                      weight="bold"
                    >
                      {title}
                    </ThemedText>
                  </View>

                  {/* Time Display */}
                  <View style={styles.timeDisplay}>
                    <ThemedText
                      colorName="subtitleText"
                      style={styles.timeText}
                      type="heading1"
                      weight="bold"
                    >
                      {formatTime(selectedDate)}
                    </ThemedText>
                  </View>

                  {/* Native Time Picker */}
                  <View style={styles.pickerContainer}>
                    <DateTimePicker
                      value={selectedDate}
                      mode="time"
                      is24Hour={false}
                      display="spinner"
                      onChange={handleDateChange}
                      style={styles.picker}
                      themeVariant={isDarkMode ? 'dark' : 'light'}
                    />
                  </View>

                  {/* Actions */}
                  <View style={styles.actions}>
                    <ThemedButton
                      style={styles.actionButton}
                      title="Cancel"
                      variant="outlined"
                      onPress={handleCancel}
                    />
                    <ThemedButton
                      style={styles.actionButton}
                      title="Set Time"
                      onPress={handleConfirm}
                    />
                  </View>
                </View>
              </Animated.View>
            </TouchableWithoutFeedback>
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
    marginTop: LAYOUT.SPACING.LARGE,
  },
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
  },
  header: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
  },
  modal: {
    ...LAYOUT.SHADOW.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.LARGE,
    width: '100%',
  },
  modalContainer: {
    maxWidth: 400,
    width: '100%',
  },
  picker: {
    height: 200,
    width: '100%',
  },
  pickerContainer: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
    marginTop: LAYOUT.SPACING.MEDIUM,
  },
  timeDisplay: {
    alignItems: 'center',
    marginBottom: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  timeText: {
    fontSize: 48,
    lineHeight: 56,
  },
  title: {
    textAlign: 'center',
  },
});
