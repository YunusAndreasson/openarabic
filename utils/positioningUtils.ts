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
 * Uses window coordinates directly - no coordinate conversion needed
 * @param layout - The layout information for the target element (window coordinates)
 * @param text - The text content to display
 * @param hasBookmark - Whether the tooltip has a bookmark button
 * @param measuredWidth - Optional measured width of the tooltip content
 * @param _containerOffsetX - Deprecated, kept for compatibility (unused)
 * @param containerWidth - The actual width of the container (for right boundary checks)
 * @returns Calculated tooltip dimensions and positioning
 */
export const calculateTooltipDimensions = (
  layout: TooltipLayout,
  text: string,
  hasBookmark: boolean,
  measuredWidth?: number,
  _containerOffsetX: number = 0,
  containerWidth: number = 0,
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
  // CRITICAL: Allow wider tooltips for long English words to prevent truncation
  const maxReasonableWidth = Math.min(SCREEN_WIDTH * 0.9, 400); // Increased to 90% of screen or 400px for long words
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

  // Handle screen boundaries with simple, direct logic
  // Use window coordinates directly - no container offset conversion needed
  const effectiveScreenMargin = SCREEN_MARGIN;
  const effectiveScreenWidth = containerWidth > 0 ? containerWidth : SCREEN_WIDTH;
  const tooltipRight = tooltipLeft + finalTooltipWidth;

  if (tooltipLeft < effectiveScreenMargin) {
    // Tooltip would go off left edge - align to left margin
    tooltipLeft = effectiveScreenMargin;
    arrowLeft = wordCenterX - effectiveScreenMargin;
  } else if (tooltipRight > effectiveScreenWidth - SCREEN_MARGIN) {
    // Tooltip would go off right edge - align to right margin
    tooltipLeft = effectiveScreenWidth - SCREEN_MARGIN - finalTooltipWidth;
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
