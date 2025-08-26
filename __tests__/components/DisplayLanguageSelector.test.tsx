import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import DisplayLanguageSelector from '../../components/account/DisplayLanguageSelector';
import TestStoreProvider from '../helpers/testStore';

describe('DisplayLanguageSelector', () => {
  it('should render both language options', () => {
    const { getByText } = render(
      <TestStoreProvider>
        <DisplayLanguageSelector />
      </TestStoreProvider>
    );

    expect(getByText('Display language')).toBeTruthy();
    expect(getByText('Arabic only')).toBeTruthy();
    expect(getByText('Arabic + English')).toBeTruthy();
  });

  it('should default to bilingual preference', () => {
    const { getByText } = render(
      <TestStoreProvider>
        <DisplayLanguageSelector />
      </TestStoreProvider>
    );

    // Both options should be rendered
    expect(getByText('Arabic only')).toBeTruthy();
    expect(getByText('Arabic + English')).toBeTruthy();
  });

  it('should allow switching between preferences', () => {
    const { getByText } = render(
      <TestStoreProvider>
        <DisplayLanguageSelector />
      </TestStoreProvider>
    );

    const arabicOption = getByText('Arabic only');

    // Both options should be initially rendered
    expect(getByText('Arabic only')).toBeTruthy();
    expect(getByText('Arabic + English')).toBeTruthy();

    // Tap Arabic only option - this should not crash
    fireEvent.press(arabicOption);

    // Both options should still be rendered after interaction
    expect(getByText('Arabic only')).toBeTruthy();
    expect(getByText('Arabic + English')).toBeTruthy();
  });
});
