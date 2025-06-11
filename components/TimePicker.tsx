import { Ionicons } from '@expo/vector-icons';
import React, { memo, useState, useCallback, useMemo, useEffect } from 'react';
import type { ViewStyle } from 'react-native';
import {
  StyleSheet,
  View,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
} from 'react-native';
import Animated from 'react-native-reanimated';

import { LAYOUT } from '@/constants/layout';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { useColors } from '@/hooks/theme/useColors';
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
    const { height: screenHeight } = useWindowDimensions();

    const {
      fadeIn: fadeBackdropIn,
      fadeOut: fadeBackdropOut,
      animatedStyle: backdropStyle,
    } = useOpacityAnimation({ initialOpacity: 0 });

    const {
      startAnimation: translateIn,
      reverseAnimation: translateOut,
      animatedStyle: translateStyle,
    } = useTransformAnimation({
      type: 'translateY',
      initialValue: screenHeight,
      targetValue: 0,
      useSpring: true,
      damping: 20,
      stiffness: 300,
    });

    const {
      startAnimation: scaleIn,
      reverseAnimation: scaleOut,
      animatedStyle: scaleStyle,
    } = useTransformAnimation({
      type: 'scale',
      initialValue: 0.9,
      targetValue: 1,
      useSpring: true,
      damping: 20,
      stiffness: 300,
    });

    useEffect(() => {
      if (isVisible) {
        fadeBackdropIn();
        translateIn();
        scaleIn();
      } else {
        fadeBackdropOut();
        translateOut();
        scaleOut();
      }
    }, [isVisible, fadeBackdropIn, fadeBackdropOut, translateIn, translateOut, scaleIn, scaleOut]);

    const modalStyle = [translateStyle, scaleStyle];

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
        <Animated.View pointerEvents="box-none" style={[styles.modalContainer, modalStyle]}>
          <View
            pointerEvents="auto"
            style={[styles.modal, { backgroundColor: colors.card, shadowColor: colors.shadow }]}
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
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons color={colors.secondaryText} name="close" size={24} />
              </TouchableOpacity>
            </View>

            {/* Time Display */}
            <View style={styles.timeDisplay}>
              <ThemedText
                colorName="subtitleText"
                style={styles.timeText}
                type="heading1"
                weight="bold"
              >
                {formatTime(selectedHour, selectedMinute)}
              </ThemedText>
            </View>

            {/* Hour Slider */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <ThemedText style={styles.sliderLabel} type="body" weight="medium">
                  Hour
                </ThemedText>
                <ThemedText style={styles.sliderValue} type="body" variant="secondary">
                  {selectedHour === 0 ? 12 : selectedHour > 12 ? selectedHour - 12 : selectedHour}{' '}
                  {selectedHour >= 12 ? 'PM' : 'AM'}
                </ThemedText>
              </View>
              <CustomSlider
                maximumValue={23}
                minimumValue={0}
                step={1}
                style={styles.slider}
                value={selectedHour}
                onValueChange={handleHourChange}
              />
            </View>

            {/* Minute Slider */}
            <View style={styles.sliderSection}>
              <View style={styles.sliderHeader}>
                <ThemedText style={styles.sliderLabel} type="body" weight="medium">
                  Minute
                </ThemedText>
                <ThemedText style={styles.sliderValue} type="body" variant="secondary">
                  {selectedMinute.toString().padStart(2, '0')}
                </ThemedText>
              </View>
              <CustomSlider
                maximumValue={59}
                minimumValue={0}
                step={5}
                style={styles.slider}
                value={selectedMinute}
                onValueChange={handleMinuteChange}
              />
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              <ThemedButton
                style={styles.actionButton}
                title="Cancel"
                variant="outlined"
                onPress={onClose}
              />
              <ThemedButton style={styles.actionButton} title="Set Time" onPress={handleConfirm} />
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
        statusBarTranslucent
        transparent
        animationType="none"
        visible={isVisible}
        onRequestClose={onClose}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <Animated.View
            style={[
              styles.backdrop,
              backdropStyle as ViewStyle,
              { backgroundColor: colors.modalOverlay },
            ]}
          >
            {modalContent}
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
    ...LAYOUT.SHADOW.LARGE,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
    padding: LAYOUT.SPACING.LARGE,
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
