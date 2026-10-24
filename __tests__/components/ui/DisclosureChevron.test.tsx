import { render } from '@testing-library/react-native';
import { describe, expect, jest, test } from '@jest/globals';
import React from 'react';

import { DisclosureChevron } from '@/components/ui/DisclosureChevron';
import { LAYOUT } from '@/constants/layout';

jest.mock('@/hooks/theme/useColors', () =>
  require('@/__tests__/helpers/componentMocks').useColorsMockFactory(),
);

jest.mock('@/components/ui/Icon', () => {
  const { View } = require('react-native');
  return {
    Icon: (props: Record<string, unknown>) => <View testID="disclosure-icon" {...props} />,
  };
});

describe('DisclosureChevron', () => {
  test('renders the forward chevron at the disclosure size, hidden from screen readers', () => {
    const { getByTestId } = render(<DisclosureChevron />);
    const icon = getByTestId('disclosure-icon');
    expect(icon.props.name).toBe('chevron-forward');
    expect(icon.props.size).toBe(LAYOUT.BUTTON.ICON_SIZE.DISCLOSURE);
    expect(icon.props.accessible).toBe(false);
    expect(icon.props.importantForAccessibility).toBe('no');
  });
});
