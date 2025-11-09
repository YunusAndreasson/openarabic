/**
 * Props for the WordTooltip component
 */
export interface WordTooltipProps {
  /** Whether the tooltip is visible */
  visible: boolean;
  /** The text to display in the tooltip */
  text?: string;
  /** The Arabic word to analyze and display with color-coding */
  arabicWord?: string;
  /** Layout information for positioning the tooltip */
  layout: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  /** Function to close the tooltip */
  onClose: () => void;
  /** Optional zIndex value to control tooltip stacking order */
  zIndex?: number;
  /** Function to open word details bottom sheet */
  onOpenWordDetails?: () => void;
  /** Whether to show word details chevron (controlled by settings) */
  showWordDetails?: boolean;
}
