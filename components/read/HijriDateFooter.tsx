import { router } from 'expo-router';
import moment from 'moment-hijri';
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { HIJRI_MONTHS } from '@/constants/hijri';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';

export const HijriDateFooter = memo(() => {
  const colors = useColors();

  const dateInfo = useMemo(() => {
    const hijriMoment = moment();
    const hijriDay = hijriMoment.iDate();
    const hijriMonth = HIJRI_MONTHS[hijriMoment.iMonth()];
    const hijriYear = hijriMoment.iYear();

    return `${hijriDay} ${hijriMonth} ${hijriYear} ${STRINGS.AH}`;
  }, []);

  const handlePress = () => {
    router.push(ROUTE_PATHS.ACCOUNT_ISLAMIC_CALENDAR);
  };

  return (
    <View style={styles.container}>
      <Pressable
        onPress={handlePress}
        style={styles.pressable}
        android_ripple={{
          color: colors.tint,
          radius: 80,
        }}
      >
        <ThemedText type="caption" weight="medium" colorName="textTertiary" style={styles.dateText}>
          {dateInfo}
        </ThemedText>
      </Pressable>
    </View>
  );
});

HijriDateFooter.displayName = 'HijriDateFooter';

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.LARGE,
    paddingHorizontal: LAYOUT.SCREEN_EDGE_PADDING,
  },
  pressable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: LAYOUT.SPACING.SMALL,
    paddingHorizontal: LAYOUT.SPACING.SMALL,
  },
  dateText: {
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.SMALL,
    letterSpacing: 0.3,
  },
});
