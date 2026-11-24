import { router } from 'expo-router';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useWidgetOffer } from '@/hooks/onboarding/useWidgetOffer';
import { currentReminderSession } from '@/services/reviewReminderJourney';
import { recordWidgetChoice, type WidgetSurface } from '@/services/widgets/placement';

export function openWidgetGuide(surface: WidgetSurface) {
  const session = currentReminderSession();
  if (session) void recordWidgetChoice(session, 'widget', surface).catch(() => undefined);
  router.push({ pathname: ROUTE_PATHS.WIDGET_GUIDE, params: { surface } });
}
export function WidgetSettingsEntry({ guest = false }: { guest?: boolean }) {
  const surface = guest ? 'guest_settings' : 'settings';
  const { show, placed } = useWidgetOffer(surface);
  if (!show) return null;
  return (
    <ThemedButton
      title={guest ? STRINGS.SETTINGS : placed ? STRINGS.WIDGET_PLACED : STRINGS.HOME_WIDGET}
      variant="outlined"
      onPress={() => (guest ? router.push(ROUTE_PATHS.WIDGET_SETTINGS) : openWidgetGuide(surface))}
    />
  );
}
