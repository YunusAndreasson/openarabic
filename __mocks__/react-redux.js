// Mock Redux state with proper structure
const mockState = {
  theme: {
    theme: 'dark', // Default to dark theme (Midnight Summer)
  },
  settings: {
    arabicFont: 'NotoSansArabic-Regular',
    arabicFontSize: 20,
    audioLanguagePreference: 'english_arabic',
    audioShuffleEnabled: false,
    dailyWordLimit: 10,
    adaptiveNewWordPacingEnabled: true,
  },
  filters: {
    difficultyRange: [1, 5],
  },
  playlist: {
    currentTrackIndex: 0,
  },
  editMode: {
    isEditMode: false,
  },
};

// Mock store for ReactReduxContext
const mockStore = {
  getState: () => mockState,
  dispatch: () => {},
  subscribe: () => () => {},
};

// Create a mock context value
const mockContextValue = {
  store: mockStore,
  storeState: mockState,
};

// Mock ReactReduxContext with React.createContext pattern
const React = require('react');
const mockContext = React.createContext(mockContextValue);

// The real hooks carry `.withTypes()`, which returns the same hook pre-typed;
// `store/hooks.ts` builds `useAppSelector` / `useAppDispatch` from it.
const useSelector = selector => selector(mockState);
useSelector.withTypes = () => useSelector;
const useDispatch = () => () => {};
useDispatch.withTypes = () => useDispatch;

module.exports = {
  useSelector,
  useDispatch,
  Provider: ({ children }) => children,
  connect: () => component => component,
  ReactReduxContext: mockContext,
};
