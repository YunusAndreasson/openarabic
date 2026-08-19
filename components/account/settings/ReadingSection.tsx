import { memo, useCallback } from 'react';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { resolveArabicFont, type ArabicFontName } from '@/constants/fonts';
import { clampArabicFontSize } from '@/constants/layout';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { setWordTapShowsTooltip } from '@/store/settingsSlice';

const FONT_DISPLAY_NAMES: Record<ArabicFontName, string> = {
  'NotoSansArabic-Regular': 'Noto Sans',
  DigitalKhattNewMadinaRegular: 'Madina',
  'Amiri-Regular': 'Amiri',
  'ScheherazadeNew-Regular': 'Scheherazade',
  'NotoNastaliqUrdu-Regular': 'Nastaliq',
};

/**
 * Reading settings — how an article looks and behaves under the finger.
 *
 * The Arabic row carries the reading size as well as the face. The size lives
 * on the sub-screen, which meant the one setting people go looking for was
 * invisible from the settings screen entirely.
 */
export const ReadingSection = memo(() => {
  const dispatch = useAppDispatch();

  // Through the resolvers, not the raw fields: an unknown persisted font or an
  // out-of-range size would otherwise print here as something the picker can't
  // show as selected.
  const currentArabicFont = useAppSelectorShallow(state =>
    resolveArabicFont(state.settings.arabicFont),
  );
  const currentArabicFontSize = useAppSelectorShallow(state =>
    clampArabicFontSize(state.settings.arabicFontSize),
  );
  const wordTapShowsTooltip = useAppSelectorShallow(
    state => state.settings.wordTapShowsTooltip ?? false,
  );

  const arabicTextValue = STRINGS.ARABIC_TEXT_VALUE.replace(
    '{font}',
    FONT_DISPLAY_NAMES[currentArabicFont],
  ).replace('{size}', String(currentArabicFontSize));

  const handleFontPress = useCallback(() => {
    router.push(ROUTE_PATHS.ACCOUNT_FONT_SELECTOR);
  }, []);

  // Word-tap preview — ON restores the lightweight inline tooltip; OFF
  // (default) opens the full word card directly on tap.
  const handleWordTapPreviewToggle = useCallback(
    (enabled: boolean) => {
      dispatch(setWordTapShowsTooltip(enabled));
    },
    [dispatch],
  );

  return (
    <SettingsSection title={STRINGS.READING_SECTION}>
      <SettingsCard
        icon="text"
        label={STRINGS.ARABIC_FONT}
        rightType="text-chevron"
        rightText={arabicTextValue}
        onPress={handleFontPress}
      />
      <SettingsCard
        icon="chatbubble-ellipses"
        label={STRINGS.WORD_TAP_PREVIEW}
        subtitle={STRINGS.WORD_TAP_PREVIEW_SUBTITLE}
        rightType="toggle"
        toggleValue={wordTapShowsTooltip}
        onToggleChange={handleWordTapPreviewToggle}
      />
    </SettingsSection>
  );
});

ReadingSection.displayName = 'ReadingSection';
