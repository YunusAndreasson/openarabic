import React from 'react';
import { Text, View } from 'react-native';
import { render } from '@testing-library/react-native';

// A simple component with no external dependencies
const SimpleComponent = () => (
  <View testID="simple-component">
    <Text>Simple Test Component</Text>
  </View>
);

describe('Simple Component Test', () => {
  it('should render without errors', () => {
    const { getByTestId } = render(<SimpleComponent />);
    expect(getByTestId('simple-component')).toBeTruthy();
  });
});
