/**
 * Standardized Chart Messaging System
 *
 * Provides consistent, clear communication across all vocabulary charts
 * with unified terminology and display formats.
 */

import { STRINGS } from '@/constants/strings';

// Standardized chart titles (no emoji — clean, straight to the point)
export const CHART_LABELS = {
  DUE_WORDS_PROGNOSIS: 'This week', // Projected due words (next 7 days)
} as const;

// `generateChartSubtitle` lived here with a single member, `retrievability`, and
// went with the retention line it wrote subtitles for. The memory sheet now
// lists horizon bands, whose labels are the bands' own; the week's at-risk
// counts moved to the due-words sheet, which states them in plain words.

// Jakob's Law: Users expect specific, actionable empty states like fitness apps (Strava, MyFitnessPal)
// Updated from generic messages to specific action + benefit format
export const EMPTY_STATE_MESSAGES = {
  dueWords: STRINGS.EMPTY_STATE_DUE_WORDS,
} as const;
