/* global jest */

// Mock for react-redux
const reactReduxMock = {
  // Provider component
  Provider: ({ children }) => children,

  // Hooks
  useSelector: jest.fn(selector => {
    // Default state for common use cases
    const defaultState = {
      theme: {
        theme: 'light', // This is what useColors is expecting
      },
      settings: {
        theme: 'light',
        fontScale: 1,
        showEnglish: true,
      },
      readingList: {
        inProgressArticles: [],
      },
      // Add other default state as needed
    };

    return selector(defaultState);
  }),

  useDispatch: jest.fn(() => jest.fn()),

  // Higher-order components
  connect: jest.fn((mapStateToProps, mapDispatchToProps) => {
    return jest.fn(Component => {
      Component.displayName = 'ConnectedComponent';
      return Component;
    });
  }),

  // Redux hooks
  useStore: jest.fn(() => ({
    getState: jest.fn(() => ({
      theme: { theme: 'light' },
      settings: { theme: 'light', fontScale: 1, showEnglish: true },
      readingList: { inProgressArticles: [] },
    })),
    dispatch: jest.fn(),
    subscribe: jest.fn(),
  })),
};

module.exports = reactReduxMock;
