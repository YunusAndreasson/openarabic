/**
 * Theme options offered by the appearance picker.
 *
 * This is data, not a component — it lived at `components/ui/ThemePicker.tsx`,
 * a `.tsx` file containing no JSX.
 */

import type { SettingsPickerOption } from '@/components/ui/SettingsPicker';
import { Theme } from '@/constants/colors';
import { STRINGS } from '@/constants/strings';

type ThemeOption = SettingsPickerOption<Theme>;

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: Theme.Light,
    title: STRINGS.THEME_BIRCHES,
    subtitle: STRINGS.THEME_SUBTITLE_LIGHT,
    icon: 'sunny',
  },
  {
    id: Theme.Dark,
    title: STRINGS.THEME_MIDNIGHT,
    subtitle: STRINGS.THEME_SUBTITLE_DARK,
    icon: 'moon',
  },
  {
    id: Theme.Sepia,
    title: STRINGS.THEME_AUTUMN,
    subtitle: STRINGS.THEME_SUBTITLE_SEPIA,
    icon: 'leaf',
  },
];

/**
 * What the settings row says the current theme is.
 *
 * The poetic names stay in the picker, where each has a subtitle to explain it.
 * On the row there is no such room, and "Birches in Spring" never told anyone
 * whether tapping it would take them light or dark.
 */
export const THEME_MODE_LABELS: Record<Theme, string> = {
  [Theme.Light]: STRINGS.THEME_MODE_LIGHT,
  [Theme.Dark]: STRINGS.THEME_MODE_DARK,
  [Theme.Sepia]: STRINGS.THEME_MODE_SEPIA,
};
