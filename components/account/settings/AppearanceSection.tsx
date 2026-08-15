import { memo, useCallback, useMemo } from 'react';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { resolveArabicFont, type ArabicFontName } from '@/constants/fonts';
import { THEME_OPTIONS } from '@/constants/themeOptions';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { selectHapticsEnabled, setHapticsEnabled } from '@/store/settingsSlice';

const FONT_DISPLAY_NAMES: Record<ArabicFontName, string> = {
  'NotoSansArabic-Regular': 'Noto Sans',
  DigitalKhattNewMadinaRegular: 'Madina',
  'Amiri-Regular': 'Amiri',
  'ScheherazadeNew-Regular': 'Scheherazade',
  'NotoNastaliqUrdu-Regular': 'Nastaliq',
};

interface AppearanceSectionProps {
  /** Open the theme picker */
  onThemePress: () => void;
  /** Open the display language picker */
  onLanguagePress: () => void;
}

/**
 * Appearance settings section - visual customization options.
 *
 * Includes: Theme, Arabic font, display language, haptics toggle.
 */
export const AppearanceSection = memo<AppearanceSectionProps>(
  ({ onThemePress, onLanguagePress }) => {
    const dispatch = useAppDispatch();
    const currentTheme = useAppSelectorShallow(state => state.theme.theme);
    const currentLanguage = useAppSelectorShallow(
      state => state.settings.displayLanguagePreference,
    );
    const currentArabicFont = useAppSelectorShallow(state =>
      resolveArabicFont(state.settings.arabicFont),
    );
    // Through the selector, not the raw field: the flag is absent from state
    // persisted before it existed, and reading it directly rendered this toggle
    // as off for every such install (while haptics were, correctly, on).
    const hapticsEnabled = useAppSelectorShallow(selectHapticsEnabled);
    const currentThemeText = useMemo(() => {
      const themeOption = THEME_OPTIONS.find(option => option.id === currentTheme);
      return themeOption?.title || STRINGS.THEME_BIRCHES;
    }, [currentTheme]);

    const currentLanguageText =
      currentLanguage === 'arabic' ? STRINGS.DISPLAY_LANGUAGE_ARABIC : STRINGS.BILINGUAL_LABEL;

    // No `?? 'Noto Sans'` fallback: `resolveArabicFont` already guarantees a
    // name the map has a label for, and the fallback was what let this row read
    // "Noto Sans" while the picker showed nothing selected.
    const currentArabicFontText = FONT_DISPLAY_NAMES[currentArabicFont];

    const handleHapticsToggle = useCallback(
      (enabled: boolean) => {
        dispatch(setHapticsEnabled(enabled));
      },
      [dispatch],
    );

    const handleFontPress = useCallback(() => {
      router.push(ROUTE_PATHS.ACCOUNT_FONT_SELECTOR);
    }, []);

    return (
      <SettingsSection title={STRINGS.APPEARANCE_SECTION}>
        <SettingsCard
          icon="color-palette"
          label={STRINGS.THEME}
          rightType="text-chevron"
          rightText={currentThemeText}
          onPress={onThemePress}
        />
        <SettingsCard
          icon="text"
          label={STRINGS.ARABIC_FONT}
          rightType="text-chevron"
          rightText={currentArabicFontText}
          onPress={handleFontPress}
        />
        <SettingsCard
          icon="language"
          label={STRINGS.DISPLAY_LANGUAGE}
          rightType="text-chevron"
          rightText={currentLanguageText}
          onPress={onLanguagePress}
        />
        <SettingsCard
          icon="phone-portrait-outline"
          label={STRINGS.HAPTICS}
          rightType="toggle"
          toggleValue={hapticsEnabled}
          onToggleChange={handleHapticsToggle}
        />
      </SettingsSection>
    );
  },
);

AppearanceSection.displayName = 'AppearanceSection';
