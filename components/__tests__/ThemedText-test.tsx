import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { ThemedText } from '../ThemedText';
import { configureStore } from '@reduxjs/toolkit';
import themeReducer from '../../store/themeSlice';
import { View } from 'react-native';

const mockStore = configureStore({
  reducer: {
    theme: themeReducer,
  },
});

describe('ThemedText', () => {
  it('renders correctly with default props', () => {
    const { toJSON } = render(
      <Provider store={mockStore}>
        <ThemedText>Default Text</ThemedText>
      </Provider>
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with different types', () => {
    const { toJSON } = render(
      <Provider store={mockStore}>
        <View>
          <ThemedText type="title">Title Text</ThemedText>
          <ThemedText type="subtitle">Subtitle Text</ThemedText>
          <ThemedText type="defaultSemiBold">Default SemiBold Text</ThemedText>
          <ThemedText type="link">Link Text</ThemedText>

          {/* New text types */}
          <ThemedText type="heading1">Heading 1</ThemedText>
          <ThemedText type="heading2">Heading 2</ThemedText>
          <ThemedText type="heading3">Heading 3</ThemedText>
          <ThemedText type="body">Body Text</ThemedText>
          <ThemedText type="bodyBold">Body Bold Text</ThemedText>
          <ThemedText type="caption">Caption Text</ThemedText>
          <ThemedText type="overline">OVERLINE TEXT</ThemedText>
          <ThemedText type="label">Label Text</ThemedText>
        </View>
      </Provider>
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with semantic variants', () => {
    const { toJSON } = render(
      <Provider store={mockStore}>
        <View>
          <ThemedText variant="error">Error Text</ThemedText>
          <ThemedText variant="warning">Warning Text</ThemedText>
          <ThemedText variant="success">Success Text</ThemedText>
          <ThemedText variant="info">Info Text</ThemedText>
          <ThemedText variant="primary">Primary Text</ThemedText>
          <ThemedText variant="secondary">Secondary Text</ThemedText>
          <ThemedText variant="subtle">Subtle Text</ThemedText>
          <ThemedText variant="disabled">Disabled Text</ThemedText>
        </View>
      </Provider>
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with custom weight and alignment', () => {
    const { toJSON } = render(
      <Provider store={mockStore}>
        <View>
          <ThemedText weight="bold">Bold Text</ThemedText>
          <ThemedText weight="300">Light Text</ThemedText>
          <ThemedText weight="600">SemiBold Text</ThemedText>
          <ThemedText align="center">Centered Text</ThemedText>
          <ThemedText align="right">Right Aligned Text</ThemedText>
        </View>
      </Provider>
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with theme colors', () => {
    const { toJSON } = render(
      <Provider store={mockStore}>
        <View>
          <ThemedText colorName="link">Link Colored Text</ThemedText>
          <ThemedText colorName="success">Success Colored Text</ThemedText>
          <ThemedText colorName="error">Error Colored Text</ThemedText>
          <ThemedText colorName="tabIconSelected">Tab Icon Colored Text</ThemedText>
        </View>
      </Provider>
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('handles combined props correctly', () => {
    const { toJSON } = render(
      <Provider store={mockStore}>
        <View>
          <ThemedText type="heading2" colorName="success" align="center">
            Centered Success Heading
          </ThemedText>
          <ThemedText type="body" weight="bold" variant="info">
            Bold Info Body Text
          </ThemedText>
          <ThemedText type="caption" align="right" variant="subtle">
            Right Aligned Subtle Caption
          </ThemedText>
        </View>
      </Provider>
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
