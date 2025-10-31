import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
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

/**
 * Calculate password strength score (0-4)
 */
function calculateStrength(password: string): number {
  let score = 0;
  if (password.length >= PASSWORD_REQUIREMENTS.minLength) score++;
  if (PASSWORD_REQUIREMENTS.hasUpperCase.test(password)) score++;
  if (PASSWORD_REQUIREMENTS.hasLowerCase.test(password)) score++;
  if (PASSWORD_REQUIREMENTS.hasNumber.test(password)) score++;
  return score;
}

/**
 * Get strength label based on score
 */
function getStrengthLabel(score: number): string {
  if (score === 0) return '';
  if (score === 1) return STRINGS.PASSWORD_STRENGTH_WEAK;
  if (score === 2) return STRINGS.PASSWORD_STRENGTH_FAIR;
  if (score === 3) return STRINGS.PASSWORD_STRENGTH_GOOD;
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
      {
        label: STRINGS.PASSWORD_REQUIREMENT_UPPERCASE,
        met: PASSWORD_REQUIREMENTS.hasUpperCase.test(password),
      },
      {
        label: STRINGS.PASSWORD_REQUIREMENT_LOWERCASE,
        met: PASSWORD_REQUIREMENTS.hasLowerCase.test(password),
      },
      {
        label: STRINGS.PASSWORD_REQUIREMENT_NUMBER,
        met: PASSWORD_REQUIREMENTS.hasNumber.test(password),
      },
    ];
  }, [password]);

  const strength = useMemo(() => calculateStrength(password), [password]);
  const strengthLabel = useMemo(() => getStrengthLabel(strength), [strength]);

  // Determine strength color
  const strengthColor = useMemo(() => {
    if (strength === 0) return colors.textTertiary;
    if (strength <= 2) return colors.error;
    if (strength === 3) return colors.warning;
    return colors.success;
  }, [strength, colors]);

  // Don't show meter if password is empty
  if (!password) return null;

  return (
    <View style={styles.container}>
      {/* Strength bar */}
      <View style={styles.strengthBarContainer}>
        <View
          style={[
            styles.strengthBar,
            {
              backgroundColor: colors.elevation2,
            },
          ]}
        >
          <View
            style={[
              styles.strengthBarFill,
              {
                width: `${(strength / 4) * 100}%`,
                backgroundColor: strengthColor,
              },
            ]}
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
            <Ionicons
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
  strengthBar: {
    borderRadius: LAYOUT.BORDER_RADIUS.SMALL,
    flex: 1,
    height: LAYOUT.SPACING.TINY,
    overflow: 'hidden',
  },
  strengthBarContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    width: '100%',
  },
  strengthBarFill: {
    height: '100%',
  },
});
