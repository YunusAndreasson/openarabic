/**
 * Tutorial overlay base component
 * Reusable semi-transparent backdrop for all tutorials (DRY!)
 */

import React, { type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { TUTORIAL_ANIMATION } from '@/constants/tutorials';
import { useColors } from '@/hooks/theme/useColors';
import { LAYOUT } from '@/constants/layout';

interface TutorialOverlayProps {
  /** Whether the overlay is visible */
  visible: boolean;
  /** Callback when backdrop is pressed */
  onDismiss: () => void;
  /** Tutorial content */
  children: ReactNode;
}

/**
 * Base overlay component for tutorials
 * Provides consistent backdrop, animations, and dismissal behavior
 *
 * @example
 * ```tsx
 * <TutorialOverlay visible={isVisible} onDismiss={handleDismiss}>
 *   <TutorialCard title="..." description="...">
 *     {/* Custom tutorial content *\/}
 *   </TutorialCard>
 * </TutorialOverlay>
 * ```
 */
export function TutorialOverlay({ visible, onDismiss, children }: TutorialOverlayProps) {
  const colors = useColors();

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="none" statusBarTranslucent={true}>
      <Pressable style={styles.container} onPress={onDismiss}>
        <Animated.View
          entering={FadeIn.duration(TUTORIAL_ANIMATION.FADE_IN_DURATION)}
          exiting={FadeOut.duration(TUTORIAL_ANIMATION.FADE_OUT_DURATION)}
          style={[styles.backdrop, { backgroundColor: colors.backdropOverlay }]}
        />
        {/* Prevent dismissal when pressing tutorial content */}
        <Pressable style={styles.contentContainer} onPress={e => e.stopPropagation()}>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

TutorialOverlay.displayName = 'TutorialOverlay';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: LAYOUT.Z_INDEX.POPUP,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    zIndex: LAYOUT.Z_INDEX.POPUP + 1,
  },
});
