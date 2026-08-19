/**
 * The tiers offered by the "New words per day" picker.
 *
 * Data, not a component — kept beside `themeOptions.ts` rather than inline in
 * the account screen, so the screen stays a composition of sections.
 */

import type { SettingsPickerOption } from '@/components/ui/SettingsPicker';
import { STRINGS } from '@/constants/strings';

/** The value the slice stores for "no daily limit". */
export const DAILY_WORD_LIMIT_UNLIMITED = 0;

export const DAILY_WORD_LIMIT_OPTIONS: SettingsPickerOption<number>[] = [
  {
    id: 10,
    title: STRINGS.DAILY_LIMIT_LOW,
    subtitle: STRINGS.DAILY_LIMIT_LOW_SUBTITLE,
    icon: 'school',
  },
  {
    id: 20,
    title: STRINGS.DAILY_LIMIT_MEDIUM,
    subtitle: STRINGS.DAILY_LIMIT_MEDIUM_SUBTITLE,
    icon: 'trending-up',
  },
  {
    id: 30,
    title: STRINGS.DAILY_LIMIT_HIGH,
    subtitle: STRINGS.DAILY_LIMIT_HIGH_SUBTITLE,
    icon: 'flash',
  },
  {
    id: DAILY_WORD_LIMIT_UNLIMITED,
    title: STRINGS.DAILY_LIMIT_UNLIMITED,
    subtitle: STRINGS.DAILY_LIMIT_UNLIMITED_SUBTITLE,
    icon: 'infinite',
  },
];
