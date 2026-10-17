/**
 * Props for the Toggle component: the native switch drawn in a settings row.
 * It shows state only; the row that hosts it owns the tap and the
 * screen-reader role (see SettingsCard).
 */
export interface ToggleProps {
  /** Current state of the toggle (true = on, false = off) */
  value: boolean;
  /** Test ID for testing */
  testID?: string;
}
