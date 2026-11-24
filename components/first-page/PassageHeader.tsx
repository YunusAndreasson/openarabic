import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/primitives/ThemedText';
import { Icon, type IconName } from '@/components/ui/Icon';
import { PASSAGE_COVER } from '@/constants/colors';
import { LAYOUT, MIN_TOUCH_TARGET } from '@/constants/layout';
import { STRINGS } from '@/constants/strings';
import { useColors } from '@/hooks/theme/useColors';
import type { BundledPassage } from '@/services/firstPage';

function CoverButton({
  label,
  icon,
  showLabel,
  onPress,
}: {
  label: string;
  icon?: IconName;
  showLabel?: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      style={[
        styles.control,
        { backgroundColor: PASSAGE_COVER.control },
        showLabel && styles.named,
      ]}
      onPress={onPress}
    >
      {icon && (
        <Icon name={icon} color={colors.cardOverlayHeading} size={LAYOUT.BUTTON.ICON_SIZE.SMALL} />
      )}
      {showLabel && (
        <ThemedText type="label" colorName="cardOverlayHeading">
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

export function PassageHeader({
  page,
  playing,
  browse,
  signIn,
  play,
  options,
}: {
  page: BundledPassage;
  playing: boolean;
  browse: () => void;
  signIn?: () => void;
  play: () => void;
  options: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <>
      <StatusBar style="light" />
      <View
        style={[styles.hero, { paddingTop: insets.top, backgroundColor: PASSAGE_COVER.background }]}
      >
        <Image
          accessible={false}
          accessibilityElementsHidden
          importantForAccessibility="no"
          source={page.cover}
          style={styles.cover}
          contentFit="cover"
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              experimental_backgroundImage: `linear-gradient(90deg, ${PASSAGE_COVER.background} 0%, ${PASSAGE_COVER.background} 22%, transparent 78%)`,
            },
          ]}
        />
        <View style={styles.toolbar}>
          <CoverButton
            label={STRINGS.FIRST_PAGE_BROWSE}
            icon={Platform.OS === 'android' ? 'close' : 'chevron-back'}
            showLabel
            onPress={browse}
          />
          {signIn && <CoverButton label={STRINGS.SIGN_IN} showLabel onPress={signIn} />}
          <View style={styles.spacer} />
          <CoverButton
            label={playing ? STRINGS.MINI_PLAYER_PAUSE_A11Y : STRINGS.FIRST_PAGE_PLAY}
            icon={playing ? 'pause' : 'play'}
            onPress={play}
          />
          <CoverButton
            label={STRINGS.FIRST_PAGE_AUDIO_OPTIONS}
            icon="headset-outline"
            onPress={options}
          />
        </View>
        <ThemedText
          type="heading1"
          accessibilityRole="header"
          colorName="cardOverlayHeading"
          style={styles.title}
        >
          {page.title}
        </ThemedText>
      </View>
      <View style={[styles.credit, { borderColor: colors.border }]}>
        <ThemedText colorName="secondaryText">
          {page.author} · {page.category}
        </ThemedText>
        <ThemedText type="caption">{page.credit}</ThemedText>
      </View>
    </>
  );
}

const coverTouchSize = Platform.OS === 'android' ? MIN_TOUCH_TARGET.LARGE : MIN_TOUCH_TARGET.MEDIUM;

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: LAYOUT.SPACING.LARGE,
    paddingBottom: LAYOUT.SPACING.MEDIUM,
    overflow: 'hidden',
  },
  cover: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '72%' },
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: LAYOUT.SPACING.TINY,
  },
  spacer: { flexGrow: 1 },
  control: {
    borderRadius: LAYOUT.BORDER_RADIUS.PILL,
    minHeight: coverTouchSize,
    minWidth: coverTouchSize,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  named: { paddingHorizontal: LAYOUT.SPACING.SMALL, gap: LAYOUT.SPACING.TINY },
  title: {
    maxWidth: LAYOUT.SPACING.XXXLARGE * 4 + LAYOUT.SPACING.SMALL,
    marginTop: LAYOUT.SPACING.SMALL,
    fontSize: LAYOUT.TYPOGRAPHY.SCALE.HUGE - LAYOUT.SPACING.TINY,
    lineHeight: LAYOUT.TYPOGRAPHY.SCALE.HUGE,
  },
  credit: {
    marginHorizontal: LAYOUT.SPACING.LARGE,
    paddingVertical: LAYOUT.SPACING.MEDIUM,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
