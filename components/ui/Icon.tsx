/**
 * The app's icon: the platform's own symbol for each name in `ICON_SYMBOLS`.
 *
 * iOS draws SF Symbols natively through expo-symbols, so icons match the tab
 * bar, the system sheets and Dynamic Type's weights. Android draws Material
 * Symbols (`Icon.android.tsx`). The brand logos have no system symbol and keep
 * their Ionicons glyph.
 *
 * Call sites name icons by the Ionicons names the app has always used, so a
 * name still means the same thing it did.
 */
import Ionicons from '@react-native-vector-icons/ionicons';
import { SymbolView } from 'expo-symbols';

import { ICON_SYMBOLS } from '@/constants/icons';

import { DEFAULT_ICON_SIZE, type IconProps } from './iconProps';

export type { IconName } from '@/constants/icons';
export type { IconProps } from './iconProps';

export function Icon({ name, size = DEFAULT_ICON_SIZE, color, style, ...viewProps }: IconProps) {
  const symbol = ICON_SYMBOLS[name].ios;

  if (!symbol) {
    return <Ionicons name={name} size={size} color={color} style={style} {...viewProps} />;
  }

  return (
    <SymbolView name={{ ios: symbol }} size={size} tintColor={color} style={style} {...viewProps} />
  );
}
