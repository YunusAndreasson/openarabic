import { useMemo } from 'react';
import { State } from 'ts-fsrs'; // Import State enum from ts-fsrs

/**
 * Calculate word status information based on FSRS parameters
 * @param fsrsDue - The due date from FSRS
 * @param fsrsStability - The stability value from FSRS
 * @param fsrsState - The state from FSRS (New, Learning, Review, Relearning)
 */
export function useWordStatus(
  fsrsDue: string,
  fsrsStability: number,
  fsrsState: number = State.New // Default to New if not provided
) {
  return useMemo(() => {
    const now = new Date();
    const dueDate = new Date(fsrsDue);
    const isOverdue = dueDate <= now;

    // Default status information
    let statusLabel = '';
    let statusIcon = 'time-outline';
    let isMastered = false;

    // First check state based on FSRS state enum
    switch (fsrsState) {
      case State.New:
        statusLabel = 'New';
        statusIcon = 'add-circle-outline';
        isMastered = false;
        break;

      case State.Learning:
        statusLabel = 'Learning';
        statusIcon = 'school-outline';
        isMastered = false;
        break;

      case State.Review:
        // In review state, use stability to determine if mastered
        if (fsrsStability >= 30) {
          statusLabel = 'Mastered';
          statusIcon = 'checkmark-circle-outline';
          isMastered = true;
        } else {
          // Show days remaining for Review state
          const daysUntilDue = Math.ceil(
            (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (isOverdue) {
            statusLabel = 'Due now';
            statusIcon = 'alert-circle-outline';
          } else if (daysUntilDue === 0) {
            statusLabel = 'Due today';
            statusIcon = 'today-outline';
          } else if (daysUntilDue === 1) {
            statusLabel = 'Due tomorrow';
            statusIcon = 'calendar-outline';
          } else {
            statusLabel = `Due in ${daysUntilDue} days`;
            statusIcon = 'calendar-outline';
          }

          isMastered = false;
        }
        break;

      case State.Relearning:
        statusLabel = 'Relearning';
        statusIcon = 'refresh-circle-outline';
        isMastered = false;
        break;

      default:
        statusLabel = 'Unknown';
        statusIcon = 'help-circle-outline';
        isMastered = false;
    }

    return {
      statusLabel,
      statusIcon,
      isMastered,
      isOverdue,
      fsrsState,
      fsrsStability,
    };
  }, [fsrsDue, fsrsStability, fsrsState]);
}
