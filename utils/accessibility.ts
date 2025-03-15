import { LAYOUT } from '../constants/layout';

/**
 * Standardized accessibility and touch target improvements
 */

/**
 * Generate standardized accessibility props for buttons
 *
 * @param label - Accessibility label for the button
 * @param hint - Optional accessibility hint
 * @param role - Optional accessibility role (defaults to 'button')
 * @returns Object with standardized accessibility props
 */
export const getButtonAccessibilityProps = (
  label: string,
  hint?: string,
  role: 'button' | 'link' | 'radio' | 'checkbox' | 'tab' = 'button'
) => {
  return {
    accessibilityRole: role,
    accessibilityLabel: label,
    ...(hint && { accessibilityHint: hint }),
    accessible: true,
  };
};

/**
 * Generate standardized hit slop props for touch targets based on size
 *
 * @param size - Size of hit slop ('small', 'medium', or 'large')
 * @returns Object with standardized hit slop
 */
export const getHitSlopProps = (size: 'small' | 'medium' | 'large' = 'medium') => {
  switch (size) {
    case 'small':
      return { hitSlop: LAYOUT.HIT_SLOP.SMALL };
    case 'large':
      return { hitSlop: LAYOUT.HIT_SLOP.LARGE };
    case 'medium':
    default:
      return { hitSlop: LAYOUT.HIT_SLOP.MEDIUM };
  }
};

/**
 * Generate standardized touchable props - combines accessibility and hit slop
 *
 * @param label - Accessibility label
 * @param hitSlopSize - Size of hit slop area
 * @param hint - Optional accessibility hint
 * @param role - Optional accessibility role
 * @returns Combined accessibility and hit slop props
 */
export const getTouchableProps = (
  label: string,
  hitSlopSize: 'small' | 'medium' | 'large' = 'medium',
  hint?: string,
  role: 'button' | 'link' | 'radio' | 'checkbox' | 'tab' = 'button'
) => {
  return {
    ...getButtonAccessibilityProps(label, hint, role),
    ...getHitSlopProps(hitSlopSize),
  };
};
