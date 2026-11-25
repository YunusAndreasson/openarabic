import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { ANALYTICS_EVENTS as E } from '@/constants/analytics';
import { LAYOUT } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { ROUTE_PATHS } from '@/constants/routes';
import { useResumeFromBackground } from '@/hooks/app/useResumeFromBackground';
import { useAuth } from '@/hooks/auth/useAuth';
import { useColors } from '@/hooks/theme/useColors';
import { analytics } from '@/services/analytics';
import { currentReminderSession } from '@/services/reviewReminderJourney';
import { widgetBridge, type Placement } from '@/services/widgets/native';
import { observePlacement } from '@/services/widgets/placement';
import { widgetPreview } from '@/services/widgets/publish';
import { initialFace } from '@/widgets/edition';

export default function WidgetGuide() {
  const { surface: entry } = useLocalSearchParams<{ surface?: string }>();
  const surface = entry === 'receipt' || entry === 'guest_settings' ? entry : 'settings';
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const candidate = widgetPreview();
  const face =
    candidate &&
    (!candidate.generation ||
      (user?.id && widgetBridge?.matchesOwner(user.id, candidate.generation)))
      ? candidate
      : initialFace;
  const [placement, setPlacement] = useState<Placement>();
  const [manual, setManual] = useState(false);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const live = useRef(false);
  const viewed = useRef(false);
  const exit = useRef('back');
  const edition = face.generation ? 'personal' : 'public';
  async function check() {
    const result = await observePlacement(currentReminderSession()).catch(() => undefined);
    if (live.current) setPlacement(result);
  }
  useEffect(() => {
    live.current = true;
    void check().then(() => {
      if (live.current && !viewed.current) {
        viewed.current = true;
        void analytics.track(E.WIDGET_GUIDE_VIEWED, { surface, edition, platform: Platform.OS });
      }
    });
    return () => {
      live.current = false;
      if (viewed.current)
        void analytics.track(E.WIDGET_OFFER_DISMISSED, { surface, exit_method: exit.current });
    };
  }, [surface, edition]);
  useResumeFromBackground(() => {
    void check();
    lock.current = false;
    setPending(false);
  });
  async function pin() {
    if (lock.current || !widgetBridge) return;
    lock.current = true;
    setPending(true);
    const accepted = await widgetBridge.pin().catch(() => false);
    void analytics.track(E.WIDGET_PIN_REQUESTED, { surface, accepted, platform: Platform.OS });
    if (!live.current) return;
    if (!accepted) setManual(true);
    lock.current = false;
    setPending(false);
    await check();
  }
  const pinning = Platform.OS === 'android' && placement?.canPin && !manual;
  const placed = !!placement?.families.length;
  return (
    <ScrollView
      contentContainerStyle={[
        styles.page,
        {
          paddingTop: insets.top + LAYOUT.SPACING.LARGE,
          paddingBottom: insets.bottom + LAYOUT.SPACING.LARGE,
        },
      ]}
    >
      <Stack.Screen options={{ title: STRINGS.WIDGET_TITLE, presentation: 'modal' }} />
      <ThemedText type="heading2">{STRINGS.WIDGET_TITLE}</ThemedText>
      <ThemedText>{STRINGS.WIDGET_DESCRIPTION}</ThemedText>
      <View style={[styles.preview, { backgroundColor: colors.elevation2 }]}>
        <ThemedText type="label">{face.kind}</ThemedText>
        <ThemedText type="arabic" accessibilityLanguage="ar" align="right">
          {face.arabic}
        </ThemedText>
        <ThemedText type="bodyBold">{face.due ? face.status : STRINGS.WIDGET_REVEAL}</ThemedText>
      </View>
      <ThemedText type="heading3">
        {placed ? STRINGS.WIDGET_PLACED : STRINGS.WIDGET_GUIDE_TITLE}
      </ThemedText>
      {!placed &&
        (pinning ? (
          <>
            <ThemedText>{STRINGS.WIDGET_PIN_COPY}</ThemedText>
            <ThemedButton
              title={STRINGS.WIDGET_ADD}
              disabled={pending}
              onPress={() => void pin()}
            />
            <ThemedButton
              title={STRINGS.WIDGET_MANUAL}
              variant="ghost"
              onPress={() => setManual(true)}
            />
          </>
        ) : (
          (Platform.OS === 'ios' ? STRINGS.WIDGET_IOS_STEPS : STRINGS.WIDGET_ANDROID_STEPS).map(
            (step, i) => (
              <ThemedText key={step}>
                {i + 1}. {step}
              </ThemedText>
            ),
          )
        ))}
      <ThemedButton
        title={STRINGS.DONE}
        onPress={() => {
          exit.current = 'done';
          if (router.canGoBack()) router.back();
          else router.replace(ROUTE_PATHS.FIRST_PAGE);
        }}
      />
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: LAYOUT.SPACING.LARGE, gap: LAYOUT.SPACING.MEDIUM },
  preview: {
    alignSelf: 'center',
    justifyContent: 'space-between',
    minHeight: 150,
    padding: LAYOUT.SPACING.LARGE,
    minWidth: 150,
    gap: LAYOUT.SPACING.SMALL,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
  },
});
