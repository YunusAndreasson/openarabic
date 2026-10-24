import { LAYOUT } from '@/constants/layout';
import { useColors } from '@/hooks/theme/useColors';

import { Icon } from './Icon';

/**
 * The "this opens something" chevron at the trailing edge of a row.
 *
 * Twelve rows drew it by hand — `chevron-forward`, the DISCLOSURE size, the
 * tertiary text colour — and one had already drifted to its own size literal,
 * the per-file number `LAYOUT.BUTTON.ICON_SIZE.DISCLOSURE` was created to
 * remove. Render it only on a row that actually navigates or opens a sheet.
 *
 * Decorative: the row it sits in carries the label and the button role, so the
 * glyph is hidden from screen readers rather than announced as a second stop.
 */
export function DisclosureChevron() {
  const colors = useColors();
  return (
    <Icon
      accessible={false}
      importantForAccessibility="no"
      color={colors.textTertiary}
      name="chevron-forward"
      size={LAYOUT.BUTTON.ICON_SIZE.DISCLOSURE}
    />
  );
}
