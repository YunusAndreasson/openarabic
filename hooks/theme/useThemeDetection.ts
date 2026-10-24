import { Theme } from '@/constants/colors';
import { useAppSelector } from '@/store/hooks';
import { selectTheme } from '@/store/themeSlice';

/**
 * The theme the app is currently painting in.
 *
 * The single resolution point, and it is the slice's: `selectTheme` reads a
 * stored `null` (redux-persist can rehydrate one) as the shipped default, Dark.
 * `useColors` used to resolve this a second time with its own fallback, and the
 * readers had drifted three ways on what an unset theme meant.
 *
 * There is no system-scheme fallback. It covered a store that was not ready,
 * which cannot happen here — react-redux throws without a Provider, and
 * PersistGate renders nothing until the store has rehydrated — and it cost a
 * `useColorScheme()` subscription in every `useColors()` caller (about 99),
 * re-rendering all of them on each OS appearance flip for a value no one saw.
 *
 * @returns the current theme (light/dark/sepia)
 */
export function useCurrentTheme(): Theme {
  return useAppSelector(selectTheme);
}

/**
 * The light/dark appearance to hand a NATIVE control — `GlassView`, a SwiftUI
 * `Host`, the date picker.
 *
 * Those follow the OS appearance unless told otherwise, and the app's theme is
 * its own setting (default Dark), so on a phone set to Light they drew
 * light-appearance chrome under dark-theme glyphs. Sepia is a light theme.
 */
export function useNativeColorScheme(): 'light' | 'dark' {
  return useCurrentTheme() === Theme.Dark ? 'dark' : 'light';
}

/**
 * Whether the app is painting in its dark theme. Sepia and Light are not.
 * @returns boolean indicating if the current theme is dark
 */
export function useIsDarkMode(): boolean {
  return useCurrentTheme() === Theme.Dark;
}
