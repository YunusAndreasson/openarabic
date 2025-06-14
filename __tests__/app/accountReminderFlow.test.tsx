import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Mocks

jest.mock('@/hooks/account', () => {
  const openMock = jest.fn();
  const toggleMock = jest.fn();
  const setMock = jest.fn();
  return {
    useAccountScreen: () => ({
      reminderTime: { enabled: false, hour: 7, minute: 0 },
      formatReminderTime: jest.fn(),
      showTimePicker: false,
      handleTimePickerOpen: openMock,
      handleTimePickerClose: jest.fn(),
      handleTimeSet: setMock,
      handleReminderToggle: toggleMock,
      handleSignOut: jest.fn(),
      handleSupportContact: jest.fn(),
      handleSocialLink: jest.fn(),
      handleLearningMethodPress: jest.fn(),
      handleClassicalTextsPress: jest.fn(),
      appVersion: '1.0.0',
      currentYear: 2024,
      user: { email: 'user@test.com' },
      handleClearCache: jest.fn(),
      handleClearQueryCache: jest.fn(),
      isClearingCache: false,
      cacheSize: 0,
      queryCacheSize: 0,
    }),
    __mocks: { openMock, toggleMock, setMock },
  };
});

jest.mock('@/app/(tabs)/read/account/index.tsx', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  const { useAccountScreen } = require('@/hooks/account');
  return {
    __esModule: true,
    default: () => {
      const { handleReminderToggle, handleTimePickerOpen, handleTimeSet } = useAccountScreen();
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <TouchableOpacity testID="reminder-toggle" onPress={() => handleReminderToggle(true)}>
            <Text>Toggle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="open-time"
            onPress={() => {
              handleTimePickerOpen();
              setOpen(true);
            }}
          >
            <Text>Open Time</Text>
          </TouchableOpacity>
          {open && (
            <TouchableOpacity
              testID="confirm-time"
              onPress={() => {
                handleTimeSet(7, 30);
                setOpen(false);
              }}
            >
              <Text>Confirm</Text>
            </TouchableOpacity>
          )}
        </>
      );
    },
  };
});

const {
  __mocks: { openMock, toggleMock, setMock },
} = require('@/hooks/account');

const AccountScreen = require('@/app/(tabs)/read/account/index.tsx').default;

describe('account reminder flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens notifications and sets a reminder', () => {
    const { getByTestId, queryByTestId } = render(<AccountScreen />);

    expect(queryByTestId('confirm-time')).toBeNull();

    fireEvent.press(getByTestId('reminder-toggle'));
    expect(toggleMock).toHaveBeenCalledWith(true);

    fireEvent.press(getByTestId('open-time'));
    expect(openMock).toHaveBeenCalled();

    fireEvent.press(getByTestId('confirm-time'));
    expect(setMock).toHaveBeenCalledWith(7, 30);
  });

  it('ignores rapid double confirm', () => {
    const { getByTestId, queryByTestId } = render(<AccountScreen />);

    fireEvent.press(getByTestId('open-time'));

    const confirm = getByTestId('confirm-time');
    fireEvent.press(confirm);
    fireEvent.press(confirm);

    expect(setMock).toHaveBeenCalledTimes(1);
    expect(queryByTestId('confirm-time')).toBeNull();
  });
});
