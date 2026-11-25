import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedButton } from '@/components/primitives/ThemedButton';
import { ThemedText } from '@/components/primitives/ThemedText';
import { Icon } from '@/components/ui';
import { LAYOUT } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useMiniPlayerClearance } from '@/hooks/audio/useMiniPlayerClearance';
import { useColors } from '@/hooks/theme/useColors';
import { getAccountFormRoute } from '@/utils/routeBuilders';

export function AccountGateActions({ saveIntent }: { saveIntent?: string }) {
  return (
    <View style={styles.actions}>
      <ThemedButton
        fullWidth
        allowTitleWrap
        title={STRINGS.CREATE_ACCOUNT}
        onPress={() =>
          router.push(getAccountFormRoute('sign-up', saveIntent), { withAnchor: true })
        }
      />
      <ThemedButton
        fullWidth
        allowTitleWrap
        variant="outlined"
        title={STRINGS.SIGN_IN}
        onPress={() =>
          router.push(getAccountFormRoute('sign-in', saveIntent), { withAnchor: true })
        }
      />
    </View>
  );
}

export function PracticeGate() {
  const colors = useColors();
  const clearance = useMiniPlayerClearance();
  const steps = [
    {
      icon: 'bookmark-outline',
      title: STRINGS.PRACTICE_GATE_SAVE,
      body: STRINGS.PRACTICE_GATE_SAVE_DESC,
    },
    {
      icon: 'school-outline',
      title: STRINGS.PRACTICE_GATE_REVIEW,
      body: STRINGS.PRACTICE_GATE_REVIEW_DESC,
    },
  ] as const;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.page, { paddingBottom: clearance }]}
    >
      <View
        style={[
          styles.hero,
          { backgroundColor: colors.elevation1, borderColor: colors.cardBorder },
        ]}
      >
        <View style={[styles.mark, { backgroundColor: colors.tint }]}>
          <Icon name="school-outline" color={colors.onTint} size={LAYOUT.BUTTON.ICON_SIZE.LARGE} />
        </View>
        <ThemedText type="heading1" accessibilityRole="header">
          {STRINGS.PRACTICE_GATE_TITLE}
        </ThemedText>
        <ThemedText colorName="secondaryText">{STRINGS.PRACTICE_GATE_DESCRIPTION}</ThemedText>
        <View style={styles.steps}>
          {steps.map(({ icon, title, body }) => (
            <View key={title} style={[styles.step, { borderTopColor: colors.cardBorder }]}>
              <Icon name={icon} color={colors.tint} size={LAYOUT.BUTTON.ICON_SIZE.MEDIUM} />
              <View style={styles.stepText}>
                <ThemedText type="bodyBold">{title}</ThemedText>
                <ThemedText colorName="secondaryText">{body}</ThemedText>
              </View>
            </View>
          ))}
        </View>
        <AccountGateActions />
      </View>
      <ThemedButton
        allowTitleWrap
        variant="ghost"
        title={STRINGS.KEEP_READING}
        onPress={() => router.navigate(ROUTE_PATHS.EXPLORE_TAB)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    ...LAYOUT.COMMON_STYLES.CONTENT_CONTAINER,
    gap: LAYOUT.SPACING.MEDIUM,
    paddingTop: LAYOUT.SPACING.MEDIUM,
  },
  hero: {
    padding: LAYOUT.SPACING.XLARGE,
    gap: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.LARGE,
    borderWidth: LAYOUT.BORDER.WIDTH.NORMAL,
  },
  mark: {
    alignSelf: 'flex-start',
    padding: LAYOUT.SPACING.MEDIUM,
    borderRadius: LAYOUT.BORDER_RADIUS.MEDIUM,
  },
  steps: { marginTop: LAYOUT.SPACING.SMALL },
  step: {
    flexDirection: 'row',
    gap: LAYOUT.SPACING.MEDIUM,
    borderTopWidth: LAYOUT.BORDER.WIDTH.NORMAL,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
  },
  stepText: { flex: 1, gap: LAYOUT.SPACING.TINY },
  actions: { gap: LAYOUT.SPACING.SMALL },
});
