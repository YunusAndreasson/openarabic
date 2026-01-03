import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

/**
 * Hook for handling Android back gestures with custom behavior
 * Provides better Android navigation UX while maintaining iOS compatibility
 */
export const useAndroidBackGesture = (onBackPress: () => void) => {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      onBackPress();
      return true; // Prevent default behavior
    });

    return () => backHandler.remove();
  }, [onBackPress]);
};
