/**
 * Props for the Toggle component
 */
export interface ToggleProps {
  /** Current state of the toggle (true = on, false = off) */
  value: boolean;
  /** Callback function when the toggle state changes */
  onValueChange: (value: boolean) => void;
  /** Test ID for testing */
  testID?: string;
}
