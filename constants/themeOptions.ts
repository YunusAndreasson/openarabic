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
    subtitle: 'Light theme',
    icon: 'sunny',
  },
  {
    id: Theme.Dark,
    title: STRINGS.THEME_MIDNIGHT,
    subtitle: 'Dark theme',
    icon: 'moon',
  },
  {
    id: Theme.Sepia,
    title: STRINGS.THEME_AUTUMN,
    subtitle: 'Sepia theme',
    icon: 'leaf',
  },
];
