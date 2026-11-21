import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NotificationPrimingCard } from '@/components/review/NotificationPrimingCard';
import { TIMING_CONFIG, fadeInStyle } from '@/constants/animation';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';

const FADE_IN_STYLE = fadeInStyle(TIMING_CONFIG.SLOW.duration);

interface FirstWordPrimingCardProps {
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * The reminders ask after the learner's first saved word, floating over the
 * foot of the reader. The completion screen's card, with copy about the word
 * that was just saved; the reader has no slot for it, so it sits over the text
 * until it is answered. `useFirstWordNotificationPriming` decides when.
 */
export const FirstWordPrimingCard = ({ onAccept, onDecline }: FirstWordPrimingCardProps) => {
  const insets = useSafeAreaInsets();

  return (
    <Animated.View
      style={[styles.container, FADE_IN_STYLE, { bottom: insets.bottom + LAYOUT.SPACING.LARGE }]}
    >
      <NotificationPrimingCard
        body={STRINGS.NOTIFICATION_PRIMING_FIRST_WORD_BODY}
        elevation="floating"
        onAccept={onAccept}
        onDecline={onDecline}
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    right: LAYOUT.SCREEN_HORIZONTAL_PADDING,
  },
});

FirstWordPrimingCard.displayName = 'FirstWordPrimingCard';
