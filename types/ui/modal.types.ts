/**
 * Props for the WordTooltip component
 */
export interface WordTooltipProps {
  /** Whether the tooltip is visible */
  visible: boolean;
  /** The text to display in the tooltip */
  text?: string;
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
}
