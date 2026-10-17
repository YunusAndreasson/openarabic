import { Icon } from '@/components/ui';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/primitives/ThemedText';
import { ProgressBar } from '@/components/common';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { PASSWORD_REQUIREMENTS } from '@/hooks/auth/useAuthForm';
import { useColors } from '@/hooks/theme/useColors';

interface PasswordStrengthMeterProps {
  password: string;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

/** Top of the strength scale — the denominator behind the bar's fill percentage. */
const MAX_STRENGTH = 3;

/**
 * Calculate password strength score based on length (0-MAX_STRENGTH)
 * 0: Empty or too short
 * 1: Minimum length met (8-11 chars)
 * 2: Good length (12-15 chars)
 * 3: Strong length (16+ chars)
 */
function calculateStrength(password: string): number {
  if (password.length < PASSWORD_REQUIREMENTS.minLength) return 0;
  if (password.length < 12) return 1;
  if (password.length < 16) return 2;
  return MAX_STRENGTH;
}

/**
 * Get strength label based on score
 */
function getStrengthLabel(score: number): string {
  if (score === 0) return '';
  if (score === 1) return STRINGS.PASSWORD_STRENGTH_FAIR;
  if (score === 2) return STRINGS.PASSWORD_STRENGTH_GOOD;
  return STRINGS.PASSWORD_STRENGTH_STRONG;
}

/**
 * Password strength meter with visual indicators and requirement checklist
 */
export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const colors = useColors();

  const requirements = useMemo((): PasswordRequirement[] => {
    return [
      {
        label: STRINGS.PASSWORD_REQUIREMENT_LENGTH.replace(
          '{minLength}',
          PASSWORD_REQUIREMENTS.minLength.toString(),
        ),
        met: password.length >= PASSWORD_REQUIREMENTS.minLength,
      },
    ];
  }, [password]);

  const strength = useMemo(() => calculateStrength(password), [password]);
  const strengthLabel = useMemo(() => getStrengthLabel(strength), [strength]);

  // Determine strength color
  const strengthColor = useMemo(() => {
    if (strength === 0) return colors.textTertiary;
    if (strength === 1) return colors.warning;
    return colors.success;
  }, [strength, colors]);

  // Don't show meter if password is empty
  if (!password) return null;

  return (
    <View style={styles.container}>
      {/* Strength bar */}
      <View style={styles.strengthBarContainer}>
        <View style={styles.strengthBarWrapper}>
          {/* Neutral track, not the tinted `progressBackground` the other bars
              use: this fill is semantic (warning/success), and a sage track
              under an amber or green fill puts a third hue in a 4px bar. */}
          <ProgressBar
            progress={(strength / MAX_STRENGTH) * 100}
            height={LAYOUT.SPACING.TINY}
            backgroundColor={colors.elevation2}
            fillColor={strengthColor}
          />
        </View>
        {strengthLabel ? (
          <ThemedText type="caption" style={{ color: strengthColor }}>
            {strengthLabel}
          </ThemedText>
        ) : null}
      </View>

      {/* Requirements checklist */}
      <View style={styles.requirementsList}>
        {requirements.map(req => (
          <View key={req.label} style={styles.requirementItem}>
            <Icon
              name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
              size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
              color={req.met ? colors.success : colors.textTertiary}
              style={styles.requirementIcon}
            />
            <ThemedText
              type="caption"
              style={[
                styles.requirementText,
                {
                  color: req.met ? colors.text : colors.textTertiary,
                },
              ]}
            >
              {req.label}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
  requirementIcon: {
    marginRight: LAYOUT.SPACING.TINY,
  },
  requirementItem: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: LAYOUT.SPACING.TINY,
  },
  requirementText: {
    flex: 1,
  },
  requirementsList: {
    marginTop: LAYOUT.SPACING.SMALL,
  },
  strengthBarContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
  // ProgressBar is width:100%; the wrapper is what shares the row with the label.
  strengthBarWrapper: {
    flex: 1,
  },
});
