import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheetHeader } from '@/components/common';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { ThemedView } from '@/components/primitives/ThemedView';
import { ANALYTICS_EVENTS } from '@/constants/analytics';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useGlobalAudioState } from '@/hooks/audio/useGlobalAudioState';
import { useColors } from '@/hooks/theme/useColors';
import { analytics } from '@/services/analytics';
import { formatSecondsToClock } from '@/utils/dateTimeUtils';
import { lightFeedback, successFeedback } from '@/utils/haptics';

const TIMER_OPTIONS = [5, 10, 15, 30, 45, 60] as const;
const DEFAULT_SELECTED_MINUTES = 15;
const COUNTDOWN_INTERVAL = 1000;

function getRemainingSeconds(endTime: number): number {
  return Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
}

export default function SleepTimerScreen(): JSX.Element {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isTimerActive, sleepTimerEndTime, onSleepTimerSet, onSleepTimerCancel } =
    useGlobalAudioState();

  const [selectedMinutes, setSelectedMinutes] = useState<number>(DEFAULT_SELECTED_MINUTES);
  const [displaySeconds, setDisplaySeconds] = useState(() =>
    getRemainingSeconds(sleepTimerEndTime),
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplaySeconds(getRemainingSeconds(sleepTimerEndTime));

    if (!isTimerActive || !sleepTimerEndTime) {
      return;
    }

    const interval = setInterval(() => {
      setDisplaySeconds(getRemainingSeconds(sleepTimerEndTime));
    }, COUNTDOWN_INTERVAL);

    return () => clearInterval(interval);
  }, [isTimerActive, sleepTimerEndTime]);

  const handleSetTimer = useCallback(() => {
    successFeedback();
    analytics.track(ANALYTICS_EVENTS.SLEEP_TIMER_SET, {
      duration_minutes: selectedMinutes,
    });
    onSleepTimerSet(selectedMinutes);
    router.back();
  }, [onSleepTimerSet, router, selectedMinutes]);

  const handleCancelTimer = useCallback(() => {
    lightFeedback();
    onSleepTimerCancel();
    router.back();
  }, [onSleepTimerCancel, router]);

  const handleOptionSelect = useCallback(
    (minutes: number) => () => setSelectedMinutes(minutes),
    [],
  );

  return (
    <ThemedView
      useSafeArea={false}
      style={[
        styles.container,
        {
          backgroundColor: colors.elevation1,
          paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE,
        },
      ]}
    >
      <BottomSheetHeader title={STRINGS.SLEEP_TIMER} />

      {!isTimerActive ? (
        <>
          <View style={styles.optionsGrid}>
            {TIMER_OPTIONS.map(minutes => (
              <View key={minutes} style={styles.optionContainer}>
                <ThemedButton
                  title={`${minutes} min`}
                  variant={selectedMinutes === minutes ? 'filled' : 'outlined'}
                  onPress={handleOptionSelect(minutes)}
                  fullWidth
                />
              </View>
            ))}
          </View>

          <View style={styles.buttonContainer}>
            <ThemedButton fullWidth title={STRINGS.SET_TIMER} onPress={handleSetTimer} />
          </View>
        </>
      ) : (
        <View style={styles.activeTimerContainer}>
          <View style={styles.timeDisplay}>
            <ThemedText colorName="tint" style={styles.timeText} type="heading1">
              {formatSecondsToClock(displaySeconds)}
            </ThemedText>
          </View>
          <View style={styles.buttonContainer}>
            <ThemedButton title={STRINGS.CANCEL} onPress={handleCancelTimer} />
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: LAYOUT.SCREEN_HORIZONTAL_PADDING,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: LAYOUT.SPACING.XLARGE,
  },
  optionContainer: {
    width: '50%',
    paddingHorizontal: LAYOUT.SPACING.TINY,
    paddingVertical: LAYOUT.SPACING.TINY,
  },
  activeTimerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  timeDisplay: {
    marginBottom: LAYOUT.SPACING.MEDIUM,
  },
  timeText: {
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.XXLARGE * 1.5,
  },
  buttonContainer: {
    width: '100%',
  },
});
