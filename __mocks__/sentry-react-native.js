module.exports = {
  captureException: () => {},
  withScope: callback => callback({ setLevel: () => {} }),
  reactNavigationIntegration: jest.fn(() => ({
    registerNavigationContainer: jest.fn(),
  })),
  init: jest.fn(),
  wrap: component => component,
};
