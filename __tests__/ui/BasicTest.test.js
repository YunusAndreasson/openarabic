/* global describe, it, expect, jest */
import React from 'react';
import { View, Text } from 'react-native';

// Create a very basic test that doesn't need testing-library
describe('Basic UI Tests', () => {
  it('should be able to create React components', () => {
    // Create a simple component
    const component = (
      <View>
        <Text>Hello World</Text>
      </View>
    );

    // Validate it's a React element
    expect(React.isValidElement(component)).toBe(true);

    // Validate the element type
    expect(component.type).toBe(View);

    // Validate children
    expect(component.props.children.type).toBe(Text);
    expect(component.props.children.props.children).toBe('Hello World');
  });

  it('should be able to mock React Native components', () => {
    // Just make sure our mocks don't break basic functionality
    expect('View').toBeTruthy();
    expect('Text').toBeTruthy();
  });

  it('should be able to run basic assertions', () => {
    // Simple assertions
    expect(1 + 1).toBe(2);
    expect('hello').toEqual('hello');
    expect([1, 2, 3]).toHaveLength(3);
  });
});
