import { memo, useCallback } from 'react';
import { router } from 'expo-router';

import { SettingsCard, SettingsSection } from '@/components/account';
import { ROUTE_PATHS } from '@/constants/routes';
import { STRINGS } from '@/constants/strings';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { setHapticsEnabled, setWordDetailsEnabled } from '@/store/settingsSlice';

interface AppearanceSectionProps {
  /** Current theme display text */
  currentThemeText: string;
  /** Current display language text */
  currentLanguageText: string;
  /** Current Arabic font display text */
  currentArabicFontText: string;
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
export const AppearanceSection = memo<AppearanceSectionProps>(
  ({
    currentThemeText,
    currentLanguageText,
    currentArabicFontText,
    onThemePress,
    onLanguagePress,
  }) => {
    const dispatch = useAppDispatch();
    const hapticsEnabled = useAppSelectorShallow(state => state.settings.hapticsEnabled);
    const wordDetailsEnabled = useAppSelectorShallow(state => state.settings.wordDetailsEnabled);

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
          icon="pulse"
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
