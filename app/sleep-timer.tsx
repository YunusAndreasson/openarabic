import { useRouter } from 'expo-router';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomSheetHeader, OptionCard } from '@/components/common';
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

  // One haptic per decision, and the button that takes the decision already
  // gives it: neither handler adds a second one on top.
  const handleSetTimer = useCallback(() => {
    void analytics.track(ANALYTICS_EVENTS.SLEEP_TIMER_SET, {
      duration_minutes: selectedMinutes,
    });
    onSleepTimerSet(selectedMinutes);
    router.back();
  }, [onSleepTimerSet, router, selectedMinutes]);

  const handleCancelTimer = useCallback(() => {
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
          {/* A choice, drawn as one: radio cards with the shared selected
              state. They used to be buttons, and the chosen one a FILLED
              button, so the sheet showed two primary actions — the duration
              and "Set timer" — of which only one acts. */}
          <View accessibilityRole="radiogroup" style={styles.optionsGrid}>
            {TIMER_OPTIONS.map(minutes => {
              const label = STRINGS.SLEEP_TIMER_MINUTES.replace('{minutes}', String(minutes));
              return (
                <View key={minutes} style={styles.optionContainer}>
                  <OptionCard
                    accessibilityLabel={label}
                    selected={selectedMinutes === minutes}
                    style={styles.optionCard}
                    onPress={handleOptionSelect(minutes)}
                  >
                    <ThemedText type="body" style={styles.optionLabel}>
                      {label}
                    </ThemedText>
                  </OptionCard>
                </View>
              );
            })}
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
    // Clears the OS grabber pill, which on iOS otherwise draws through the title.
    paddingTop: LAYOUT.BOTTOM_SHEET.GRABBER_CLEARANCE,
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
  // OptionCard draws the selected state (fill and edge); this is only its box.
  optionCard: {
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  optionLabel: {
    textAlign: 'center',
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
