import { selectionFeedback } from '@/utils/haptics';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

describe('haptics - debounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('prevents double selectionFeedback within debounce window', () => {
    const { selectionAsync } = require('expo-haptics');

    selectionFeedback();
    selectionFeedback();

    // Only first call should pass
    expect(selectionAsync).toHaveBeenCalledTimes(1);

    // Advance time past debounce and call again
    jest.advanceTimersByTime(60);
    selectionFeedback();
    expect(selectionAsync).toHaveBeenCalledTimes(2);
  });
});
