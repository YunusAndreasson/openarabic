import { memo, useCallback, useMemo } from 'react';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { THEME_OPTIONS } from '@/components/ui/ThemePicker';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { setHapticsEnabled, setWordDetailsEnabled } from '@/store/settingsSlice';

const FONT_DISPLAY_NAMES: Record<string, string> = {
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
 * Includes: Theme, Arabic font, display language, word details toggle, haptics toggle.
 */
export const AppearanceSection = memo<AppearanceSectionProps>(({ onThemePress, onLanguagePress }) => {
    const dispatch = useAppDispatch();
    const currentTheme = useAppSelectorShallow(state => state.theme.theme);
    const currentLanguage = useAppSelectorShallow(state => state.settings.displayLanguagePreference);
    const currentArabicFont = useAppSelectorShallow(state => state.settings.arabicFont);
    const hapticsEnabled = useAppSelectorShallow(state => state.settings.hapticsEnabled);
    const wordDetailsEnabled = useAppSelectorShallow(state => state.settings.wordDetailsEnabled);

    const currentThemeText = useMemo(() => {
      const themeOption = THEME_OPTIONS.find(option => option.id === currentTheme);
      return themeOption?.title || STRINGS.THEME_BIRCHES;
    }, [currentTheme]);

    const currentLanguageText =
      currentLanguage === 'arabic' ? STRINGS.DISPLAY_LANGUAGE_ARABIC : STRINGS.BILINGUAL_LABEL;

    const currentArabicFontText = FONT_DISPLAY_NAMES[currentArabicFont] ?? 'Noto Sans';

    const handleHapticsToggle = useCallback(
      (enabled: boolean) => {
        dispatch(setHapticsEnabled(enabled));
      },
      [dispatch],
    );

    const handleWordDetailsToggle = useCallback(
      (enabled: boolean) => {
        dispatch(setWordDetailsEnabled(enabled));
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
          icon="eye-outline"
          label={STRINGS.WORD_DETAILS}
          subtitle={STRINGS.WORD_DETAILS_DESCRIPTION}
          rightType="toggle"
          toggleValue={wordDetailsEnabled}
          onToggleChange={handleWordDetailsToggle}
        />
        <SettingsCard
          icon="cellular"
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
