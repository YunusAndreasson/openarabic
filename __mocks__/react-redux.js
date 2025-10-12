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
    displayLanguagePreference: 'arabic_english',
    dailyWordLimit: 10,
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

module.exports = {
  useSelector: selector => selector(mockState),
  useDispatch: () => () => {},
  Provider: ({ children }) => children,
  connect: () => component => component,
};
