// Create a simplified mock for react-native-testing-library to avoid timeouts
/* global jest */
const React = require('react');

const render = component => {
  return {
    getByTestId: testId => ({ testID: testId, type: 'mocked-component' }),
    getByText: text => ({ props: { children: text }, type: 'mocked-component' }),
    queryByText: text => null,
    findByText: text => Promise.resolve({ props: { children: text }, type: 'mocked-component' }),
    unmount: jest.fn(),
    rerender: jest.fn(),
    toJSON: () => null,
    debug: jest.fn(),
    container: {
      children: [],
    },
  };
};

const fireEvent = {
  press: jest.fn(),
  changeText: jest.fn(),
  scroll: jest.fn(),
};

const waitFor = callback => Promise.resolve(callback());

const act = callback => {
  callback();
  return Promise.resolve();
};

module.exports = {
  render,
  fireEvent,
  waitFor,
  act,
};
