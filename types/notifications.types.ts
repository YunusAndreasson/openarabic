/**
 * Time settings for scheduling reminder notifications
 */
export interface ReminderTime {
  /** Hour of the day (0-23) */
  hour: number;
  /** Minute of the hour (0-59) */
  minute: number;
  /** Whether the reminder is enabled */
  enabled: boolean;
}
