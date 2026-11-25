import { router, Stack, useIsFocused } from 'expo-router';
import { useEffect } from 'react';
import { ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { openWidgetGuide } from '@/components/widget/WidgetOffer';
import { STRINGS } from '@/constants/strings';
import { ROUTE_PATHS } from '@/constants/routes';
import { LAYOUT } from '@/constants/layout';
import { currentReminderSession } from '@/services/reviewReminderJourney';
import { widgetOfferVisible } from '@/services/widgets/placement';
import { useWidgetOffer } from '@/hooks/onboarding/useWidgetOffer';

export default function WidgetSettings() {
  const { show, placed } = useWidgetOffer('guest_settings');
  const focused = useIsFocused();
  const insets = useSafeAreaInsets();
  useEffect(() => {
    const session = currentReminderSession();
    if (focused && show && session)
      void widgetOfferVisible('guest_settings', session).catch(() => undefined);
  }, [focused, show]);
  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: LAYOUT.SPACING.LARGE,
        paddingTop: insets.top + LAYOUT.SPACING.LARGE,
        paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE,
        gap: LAYOUT.SPACING.MEDIUM,
      }}
    >
      <Stack.Screen options={{ title: STRINGS.SETTINGS }} />
      <ThemedText type="heading2">{STRINGS.HOME_WIDGET}</ThemedText>
      <ThemedText>
        {show ? STRINGS.WIDGET_SETTINGS_COPY : STRINGS.WIDGET_SETTINGS_UNAVAILABLE}
      </ThemedText>
      {show && (
        <ThemedButton
          title={placed ? STRINGS.WIDGET_PLACED : STRINGS.WIDGET_SHOW_GUIDE}
          onPress={() => openWidgetGuide('guest_settings')}
        />
      )}
      <ThemedButton
        title={STRINGS.DONE}
        variant="ghost"
        onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace(ROUTE_PATHS.EXPLORE_TAB);
        }}
      />
    </ScrollView>
  );
}
