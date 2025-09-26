import { SCREEN_WIDTH } from '@/constants/layout';

// ===== TOOLTIP CONSTANTS =====
export const TOOLTIP_CONSTANTS = {
  ARROW_SIZE: 6,
  MIN_PADDING: 8, // Reduced for tighter appearance
  SCREEN_MARGIN: 16,
  Z_INDEX: 999999,
  MIN_WIDTH: 70, // Reduced for tighter appearance
  HEIGHT: 32, // Reduced for tighter appearance
  CHAR_WIDTH: 9, // Approximate average char width at fontSize 15 for tighter estimate (tests expect 9)
  BOOKMARK_WIDTH: 32,
  GAP_WIDTH: 8,
} as const;

// ===== TOOLTIP POSITIONING INTERFACES =====
export interface TooltipLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TooltipDimensions {
  tooltipLeft: number;
  tooltipTop: number;
  tooltipWidth: number;
  tooltipHeight: number;
  arrowLeft: number;
}

// ===== TOOLTIP POSITIONING UTILITIES =====

/**
 * Calculates tooltip dimensions and positioning based on layout and content
 * @param layout - The layout information for the target element
 * @param text - The text content to display
 * @param hasBookmark - Whether the tooltip has a bookmark button
 * @returns Calculated tooltip dimensions and positioning
 */
export const calculateTooltipDimensions = (
  layout: TooltipLayout,
  text: string,
  hasBookmark: boolean,
  measuredWidth?: number
): TooltipDimensions => {
  const {
    ARROW_SIZE,
    MIN_PADDING,
    SCREEN_MARGIN,
    MIN_WIDTH,
    HEIGHT,
    CHAR_WIDTH,
    BOOKMARK_WIDTH,
    GAP_WIDTH,
  } = TOOLTIP_CONSTANTS;

  // Estimate text width with accurate calculation
  const textWidth = text.length * CHAR_WIDTH;

  // Add space for bookmark if present
  const bookmarkWidth = hasBookmark ? BOOKMARK_WIDTH : 0;
  const gapWidth = hasBookmark ? GAP_WIDTH : 0;

  // Reserve space for chevron (always present)
  const chevronWidth = 24; // Approximate width of chevron icon

  // Calculate total content width
  const contentWidth = textWidth + bookmarkWidth + gapWidth + chevronWidth;

  // Calculate tooltip width with padding
  const estimatedTooltipWidth = Math.max(contentWidth + MIN_PADDING * 2, MIN_WIDTH);

  // Use measured width if available, but cap it at a reasonable maximum
  const maxReasonableWidth = Math.min(SCREEN_WIDTH * 0.8, 320); // Cap at 80% of screen or 320px
  const baseWidth =
    measuredWidth && measuredWidth > 0 && measuredWidth <= maxReasonableWidth
      ? measuredWidth
      : Math.min(estimatedTooltipWidth, maxReasonableWidth);

  // Ensure minimum width and reasonable maximum
  const finalTooltipWidth = Math.max(MIN_WIDTH, Math.min(baseWidth, maxReasonableWidth));

  // Calculate tooltip height
  const tooltipHeight = HEIGHT;

  // Calculate position
  const wordCenterX = layout.x + layout.width / 2;
  const tooltipTop = layout.y - tooltipHeight;

  // Calculate horizontal position with better centering
  let tooltipLeft = wordCenterX - finalTooltipWidth / 2;
  let arrowLeft = finalTooltipWidth / 2;

  // Handle screen boundaries with improved logic
  const tooltipRight = tooltipLeft + finalTooltipWidth;

  if (tooltipLeft < SCREEN_MARGIN) {
    // Tooltip would go off left edge - align to left margin
    tooltipLeft = SCREEN_MARGIN;
    arrowLeft = wordCenterX - SCREEN_MARGIN;
  } else if (tooltipRight > SCREEN_WIDTH - SCREEN_MARGIN) {
    // Tooltip would go off right edge - align to right margin
    tooltipLeft = SCREEN_WIDTH - SCREEN_MARGIN - finalTooltipWidth;
    arrowLeft = wordCenterX - tooltipLeft;
  }

  // Ensure arrow stays within tooltip bounds and points to word center when possible
  const minArrowLeft = ARROW_SIZE + 8; // Extra margin from left edge
  const maxArrowLeft = finalTooltipWidth - ARROW_SIZE - 8; // Extra margin from right edge
  arrowLeft = Math.max(minArrowLeft, Math.min(arrowLeft, maxArrowLeft));

  // If arrow is too far from word center, try to center it better
  const idealArrowLeft = finalTooltipWidth / 2;
  if (Math.abs(arrowLeft - idealArrowLeft) > finalTooltipWidth * 0.3) {
    arrowLeft = Math.max(minArrowLeft, Math.min(idealArrowLeft, maxArrowLeft));
  }

  return {
    tooltipLeft,
    tooltipTop,
    tooltipWidth: finalTooltipWidth,
    tooltipHeight,
    arrowLeft,
  };
};

/**
 * Calculates arrow position for tooltip
 * @param wordCenterX - Center X position of the target word
 * @param tooltipLeft - Left position of the tooltip
 * @param tooltipWidth - Width of the tooltip
 * @param arrowSize - Size of the arrow
 * @returns Calculated arrow position
 */
export const calculateArrowPosition = (
  wordCenterX: number,
  tooltipLeft: number,
  tooltipWidth: number,
  arrowSize: number = TOOLTIP_CONSTANTS.ARROW_SIZE
): number => {
  let arrowLeft = wordCenterX - tooltipLeft;

  // Clamp arrow position within tooltip bounds
  return Math.max(arrowSize, Math.min(arrowLeft, tooltipWidth - arrowSize));
};

/**
 * Handles screen boundary constraints for tooltip positioning
 * @param tooltipLeft - Proposed left position of tooltip
 * @param tooltipWidth - Width of the tooltip
 * @param screenMargin - Margin from screen edges
 * @returns Adjusted tooltip left position
 */
export const handleScreenBoundaries = (
  tooltipLeft: number,
  tooltipWidth: number,
  screenMargin: number = TOOLTIP_CONSTANTS.SCREEN_MARGIN
): number => {
  if (tooltipLeft < screenMargin) {
    return screenMargin;
  }

  if (tooltipLeft + tooltipWidth > SCREEN_WIDTH - screenMargin) {
    return SCREEN_WIDTH - screenMargin - tooltipWidth;
  }

  return tooltipLeft;
};
