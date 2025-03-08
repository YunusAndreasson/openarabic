import * as React from 'react';
import renderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemedText } from '../ThemedText';

// Create a mock store
const mockStore = configureStore({
  reducer: {
    theme: (state = { theme: 'light' }) => state,
  },
});

it(`renders correctly`, () => {
  const tree = renderer
    .create(
      <Provider store={mockStore}>
        <ThemedText>Snapshot test!</ThemedText>
      </Provider>
    )
    .toJSON();

  expect(tree).toMatchSnapshot();
});
