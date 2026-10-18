import { memo, useCallback, useMemo } from 'react';

import { SettingsCard, SettingsSection } from '@/components/account';
import { THEME_MODE_LABELS } from '@/constants/themeOptions';
import { STRINGS } from '@/constants/strings';
import { useAppDispatch, useAppSelectorShallow } from '@/store/hooks';
import { selectHapticsEnabled, setHapticsEnabled } from '@/store/settingsSlice';

interface AppSectionProps {
  /** Open the theme picker */
  onThemePress: () => void;
  /**
   * Clear cached audio, articles and query data. Absent when there is nothing
   * to clear: the row then only reports "Nothing to clear" and takes no press.
   */
  onClearCachePress?: () => void;
  /** Formatted cache size, or the "nothing to clear" copy */
  cacheSizeText: string;
}

/**
 * App-wide settings — the ones that aren't about reading, practising or
 * listening in particular.
 */
export const AppSection = memo<AppSectionProps>(
  ({ onThemePress, onClearCachePress, cacheSizeText }) => {
    const dispatch = useAppDispatch();
    const currentTheme = useAppSelectorShallow(state => state.theme.theme);
    // Through the selector, not the raw field: the flag is absent from state
    // persisted before it existed, and reading it directly rendered this toggle
    // as off for every such install (while haptics were, correctly, on).
    const hapticsEnabled = useAppSelectorShallow(selectHapticsEnabled);

    const currentThemeText = useMemo(
      () => (currentTheme ? THEME_MODE_LABELS[currentTheme] : STRINGS.THEME_MODE_DARK),
      [currentTheme],
    );

    const handleHapticsToggle = useCallback(
      (enabled: boolean) => {
        dispatch(setHapticsEnabled(enabled));
      },
      [dispatch],
    );

    return (
      <SettingsSection title={STRINGS.APP_SECTION}>
        <SettingsCard
          icon="color-palette"
          label={STRINGS.THEME}
          rightType="text-chevron"
          rightText={currentThemeText}
          onPress={onThemePress}
        />
        <SettingsCard
          icon="phone-portrait-outline"
          label={STRINGS.HAPTICS}
          rightType="toggle"
          toggleValue={hapticsEnabled}
          onToggleChange={handleHapticsToggle}
        />
        <SettingsCard
          icon="trash-outline"
          label={STRINGS.CLEAR_CACHE}
          subtitle={cacheSizeText}
          rightType="none"
          onPress={onClearCachePress}
        />
      </SettingsSection>
    );
  },
);

AppSection.displayName = 'AppSection';
