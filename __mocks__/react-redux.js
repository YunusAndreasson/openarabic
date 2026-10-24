// react-redux for tests, in two modes.
//
// Under a <Provider> (createHookTestWrapper's `withRedux`, or a suite's own
// `<Provider store={setupTestStore(...)}>`), the real react-redux
// runs against that real store: selectors see its state, dispatches reach its
// reducers and subscribers re-render. This stub used to ignore the Provider
// entirely, so every such suite ran against the fixed state below instead.
//
// Without a Provider, which is how most component suites render, the hooks
// read this fixed state and dispatch goes nowhere.
//
// `react-redux/alternate-renderers` is the package's own CommonJS build; the
// bare name resolves to an untransformed ESM build under the `react-native`
// export condition (and is mapped to this file).
const React = require('react');

const actual = jest.requireActual('react-redux/alternate-renderers');

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

const mockStore = {
  getState: () => mockState,
  dispatch: action => action,
  subscribe: () => () => {},
};

const useHasProvider = () => React.useContext(actual.ReactReduxContext) !== null;

// The real hooks carry `.withTypes()`, which returns the same hook pre-typed;
// `store/hooks.ts` builds `useAppSelector` / `useAppDispatch` from it.
const useSelector = (selector, equalityFnOrOptions) =>
  useHasProvider() ? actual.useSelector(selector, equalityFnOrOptions) : selector(mockState);
useSelector.withTypes = () => useSelector;

const useDispatch = () => (useHasProvider() ? actual.useDispatch() : mockStore.dispatch);
useDispatch.withTypes = () => useDispatch;

const useStore = () => (useHasProvider() ? actual.useStore() : mockStore);
useStore.withTypes = () => useStore;

module.exports = {
  ...actual,
  useSelector,
  useDispatch,
  useStore,
};
