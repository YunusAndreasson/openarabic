module.exports = {
  // Use jest.fn() so tests can verify errors are captured
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  withScope: callback =>
    callback({
      setLevel: jest.fn(),
      setUser: jest.fn(),
      setContext: jest.fn(),
      setTag: jest.fn(),
      setExtra: jest.fn(),
    }),
  captureFeedback: jest.fn(),
  reactNavigationIntegration: jest.fn(() => ({
    registerNavigationContainer: jest.fn(),
  })),
  init: jest.fn(),
  wrap: component => component,
};
