import { SCREEN_WIDTH } from '@/constants/layout';

// ===== TOOLTIP CONSTANTS =====
export const TOOLTIP_CONSTANTS = {
  ARROW_SIZE: 6,
  MIN_PADDING: 12,
  SCREEN_MARGIN: 16,
  Z_INDEX: 999999,
  MIN_WIDTH: 80,
  MAX_WIDTH_RATIO: 0.85,
  HEIGHT: 40,
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
    MAX_WIDTH_RATIO,
    HEIGHT,
    CHAR_WIDTH,
    BOOKMARK_WIDTH,
    GAP_WIDTH,
  } = TOOLTIP_CONSTANTS;

  // Estimate text width (rough calculation)
  const textWidth = text.length * CHAR_WIDTH;

  // Add space for bookmark if present
  const bookmarkWidth = hasBookmark ? BOOKMARK_WIDTH : 0;
  const gapWidth = hasBookmark ? GAP_WIDTH : 0;

  // Calculate total content width
  const contentWidth = textWidth + bookmarkWidth + gapWidth;

  // Calculate tooltip width with padding
  const estimatedTooltipWidth = Math.max(contentWidth + MIN_PADDING * 2, MIN_WIDTH);

  // Apply maximum width constraint
  const maxWidth = SCREEN_WIDTH * MAX_WIDTH_RATIO;

  // Prefer the actual measured width when available to avoid clipping or overestimation
  const baseWidth = measuredWidth && measuredWidth > 0 ? measuredWidth : estimatedTooltipWidth;
  const finalTooltipWidth = Math.min(baseWidth, maxWidth);

  // Calculate tooltip height
  const tooltipHeight = HEIGHT;

  // Calculate position
  const wordCenterX = layout.x + layout.width / 2;
  const tooltipTop = layout.y - tooltipHeight;

  // Calculate horizontal position
  let tooltipLeft = wordCenterX - finalTooltipWidth / 2;
  let arrowLeft = finalTooltipWidth / 2;

  // Handle screen boundaries
  if (tooltipLeft < SCREEN_MARGIN) {
    tooltipLeft = SCREEN_MARGIN;
    arrowLeft = wordCenterX - SCREEN_MARGIN;
  } else if (tooltipLeft + finalTooltipWidth > SCREEN_WIDTH - SCREEN_MARGIN) {
    tooltipLeft = SCREEN_WIDTH - SCREEN_MARGIN - finalTooltipWidth;
    arrowLeft = wordCenterX - tooltipLeft;
  }

  // Clamp arrow position within tooltip bounds
  arrowLeft = Math.max(ARROW_SIZE, Math.min(arrowLeft, finalTooltipWidth - ARROW_SIZE));

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
