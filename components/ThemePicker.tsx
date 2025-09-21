import { memo, type FC } from 'react';

import { SettingsPicker, type SettingsPickerOption } from '@/components/ui/SettingsPicker';
import { Theme } from '@/constants/colors';
import { STRINGS } from '@/constants/strings';
import { setTheme } from '@/store/themeSlice';

type ThemeOption = SettingsPickerOption<Theme>;

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: Theme.Light,
    title: STRINGS.THEME_BIRCHES,
    subtitle: 'Clean, bright interface with crisp contrast for daytime reading',
    icon: 'sunny',
  },
  {
    id: Theme.Dark,
    title: STRINGS.THEME_MIDNIGHT,
    subtitle: 'Gentle on the eyes with warm tones for comfortable evening study',
    icon: 'moon',
  },
  {
    id: Theme.Sepia,
    title: STRINGS.THEME_AUTUMN,
    subtitle: 'Warm, nostalgic tones reminiscent of aged parchment for cozy reading',
    icon: 'leaf',
  },
];

export interface ThemePickerProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ThemePicker: FC<ThemePickerProps> = memo(({ isVisible, onClose }) => {
  return (
    <SettingsPicker
      isVisible={isVisible}
      onClose={onClose}
      title={STRINGS.THEME}
      options={THEME_OPTIONS}
      currentValueSelector={state => state.theme.theme}
      onValueChange={setTheme}
      snapPoints={[440]}
      supportsOptimisticUpdates={true}
    />
  );
});

ThemePicker.displayName = 'ThemePicker';
