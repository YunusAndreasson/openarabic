import { useCallback, useEffect, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useOpacityAnimation, useTransformAnimation } from '@/hooks/animations';
import { lightFeedback, selectionFeedback } from '@/utils/haptics';

export interface UseSleepTimerModalOptions {
  isVisible: boolean;
  onClose: () => void;
  onTimerSet: (minutes: number) => void;
  onTimerCancel: () => void;
}

export interface UseSleepTimerModalResult {
  selectedMinutes: number;
  backdropStyle: ViewStyle | Record<string, unknown>;
  modalStyle: (ViewStyle | Record<string, unknown>)[];
  handleSetTimer: () => void;
  handleCancelTimer: () => void;
  handleOptionSelect: (minutes: number) => void;
}

export const useSleepTimerModal = (
  options: UseSleepTimerModalOptions
): UseSleepTimerModalResult => {
  const { isVisible, onClose, onTimerSet, onTimerCancel } = options;
  const [selectedMinutes, setSelectedMinutes] = useState(15);
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
  }, [
    isVisible,
    fadeBackdropIn,
    fadeBackdropOut,
    translateIn,
    translateOut,
    scaleIn,
    scaleOut,
  ]);

  const modalStyle = [translateStyle, scaleStyle];

  const handleSetTimer = useCallback(() => {
    lightFeedback();
    onTimerSet(selectedMinutes);
    onClose();
  }, [onClose, onTimerSet, selectedMinutes]);

  const handleCancelTimer = useCallback(() => {
    onTimerCancel();
    onClose();
  }, [onClose, onTimerCancel]);

  const handleOptionSelect = useCallback((minutes: number) => {
    selectionFeedback();
    setSelectedMinutes(minutes);
  }, []);

  return {
    selectedMinutes,
    backdropStyle: backdropStyle as ViewStyle,
    modalStyle: modalStyle as (ViewStyle | Record<string, unknown>)[],
    handleSetTimer,
    handleCancelTimer,
    handleOptionSelect,
  };
};

export default useSleepTimerModal;
