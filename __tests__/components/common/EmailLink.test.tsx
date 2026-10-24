/**
 * EmailLink: the inline "Contact us" address in the legal documents.
 *
 * It used to gate on `Linking.canOpenURL('mailto:…')`, which is false on
 * Android 11+ and on iOS without a declared scheme — so tapping the address
 * did nothing on most phones. A tap now goes straight to the mail composer.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import React from 'react';
import { Linking } from 'react-native';

import { EmailLink } from '@/components/common/EmailLink';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

describe('EmailLink', () => {
  test('opens the mail composer even where canOpenURL says no', () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(false);

    render(<EmailLink email="hello@example.com" />);
    fireEvent.press(screen.getByRole('link', { name: 'hello@example.com' }));

    expect(openURL).toHaveBeenCalledWith('mailto:hello@example.com');
  });
});
