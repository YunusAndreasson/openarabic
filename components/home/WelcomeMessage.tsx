import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import moment from 'moment-hijri';
import { useMemo, useCallback, memo, type FC } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { HIJRI_MONTHS } from '@/constants/hijri';
import { LAYOUT, TYPOGRAPHY_HIERARCHY } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

const WelcomeMessage: FC = () => {
  const colors = useColors();

  const dateMessage = useMemo(() => {
    // Get Hijri date
    const hijriMoment = moment();
    const hijriDay = hijriMoment.iDate();
    const hijriMonth = HIJRI_MONTHS[hijriMoment.iMonth()];
    const hijriYear = hijriMoment.iYear();

    // Create the minimal date message
    return `${hijriDay} ${hijriMonth} ${hijriYear} ${STRINGS.AH}`;
  }, []);

  const handleCalendarPress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_ISLAMIC_CALENDAR);
  }, [router]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        hitSlop={LAYOUT.HIT_SLOP.MEDIUM}
        style={styles.dateContainer}
        onPress={handleCalendarPress}
      >
        <ThemedText colorName="textTertiary" style={styles.dateText} type="caption" weight="normal">
          {dateMessage}
        </ThemedText>
        <Ionicons
          color={colors.textTertiary}
          name="chevron-forward-outline"
          size={LAYOUT.BUTTON.ICON_SIZE.SMALL}
          style={styles.chevronIcon}
        />
      </TouchableOpacity>
    </View>
  );
};

WelcomeMessage.displayName = 'WelcomeMessage';

export default memo(WelcomeMessage);

const styles = StyleSheet.create({
  chevronIcon: {
    opacity: LAYOUT.OPACITY.MEDIUM,
  },
  container: {
    alignItems: 'center',
    paddingBottom: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
    paddingTop: LAYOUT.SPACING.XXLARGE,
  },
  dateContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: LAYOUT.SPACING.SMALL,
    opacity: LAYOUT.OPACITY.PRESSED,
  },
  dateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    fontVariant: ['tabular-nums'],
    fontWeight: '400',
    letterSpacing: TYPOGRAPHY_HIERARCHY.MICRO_ADJUSTMENTS.CONTENT_TYPES.METADATA.letterSpacing,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.SMALL * LAYOUT.TYPOGRAPHY.LINE_HEIGHT.TIGHT,
    textAlign: 'center',
  },
});
