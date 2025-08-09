import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import TouchableIcon from '@/components/TouchableIcon';

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success', Error: 'error' },
}));

describe('Haptics - nested handlers', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('fires selectionFeedback only once when parent and child both trigger', () => {
    const { selectionAsync } = require('expo-haptics');

    const Parent = ({ children }: { children: React.ReactNode }) => {
      return (
        // Wrap child in a view-less component that also triggers haptics on press
        <TouchableIcon icon="add" onPress={() => {}} hapticFeedback>
          {children}
        </TouchableIcon>
      );
    };

    const Child = () => <TouchableIcon icon="add" onPress={() => {}} hapticFeedback />;

    const { getByTestId } = render(
      <Parent>
        <Child />
      </Parent>
    );

    // Press the nested child touchable via testID on the icon
    fireEvent.press(getByTestId('mock-icon-Ionicons'));

    // Debounce should limit to a single call
    expect(selectionAsync).toHaveBeenCalledTimes(1);
  });
});
