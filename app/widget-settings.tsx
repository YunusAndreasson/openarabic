import { Stack, useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { openWidgetGuide } from '@/components/widget/WidgetOffer';
import { STRINGS } from '@/constants/strings';
import { LAYOUT } from '@/constants/layout';
import { currentReminderSession } from '@/services/reviewReminderJourney';
import { widgetOfferVisible } from '@/services/widgets/placement';
import { useWidgetOffer } from '@/hooks/onboarding/useWidgetOffer';

export default function WidgetSettings() {
  const { show, placed } = useWidgetOffer('guest_settings');
  const focused = useIsFocused();
  useEffect(() => {
    const session = currentReminderSession();
    if (focused && show && session)
      void widgetOfferVisible('guest_settings', session).catch(() => undefined);
  }, [focused, show]);
  return (
    <View style={{ padding: LAYOUT.SPACING.LARGE, gap: LAYOUT.SPACING.MEDIUM }}>
      <Stack.Screen options={{ title: STRINGS.SETTINGS }} />
      {show && (
        <>
          <ThemedText type="heading2">{STRINGS.HOME_WIDGET}</ThemedText>
          <ThemedText>{STRINGS.WIDGET_SETTINGS_COPY}</ThemedText>
          <ThemedButton
            title={placed ? STRINGS.WIDGET_PLACED : STRINGS.WIDGET_SHOW_GUIDE}
            onPress={() => openWidgetGuide('guest_settings')}
          />
        </>
      )}
    </View>
  );
}
