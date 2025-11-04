/**
 * Theme Options
 * Shared theme configuration options used by SettingsPicker
 */

import type { SettingsPickerOption } from '@/components/ui/SettingsPicker';
import { Theme } from '@/constants/colors';
import { STRINGS } from '@/constants/strings';

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
    subtitle: 'Gentle on the eyes with cool, calming tones for comfortable evening study',
    icon: 'moon',
  },
  {
    id: Theme.Sepia,
    title: STRINGS.THEME_AUTUMN,
    subtitle: 'Warm, nostalgic tones reminiscent of aged parchment for cozy reading',
    icon: 'leaf',
  },
];
