// Define mock values
const MOCK_LIGHT_THEME = 'light';
const MOCK_DARK_THEME = 'dark';

const MOCK_COLORS = {
  [MOCK_LIGHT_THEME]: {
    text: '#000000',
    background: '#FFFFFF',
    tint: '#007AFF',
    // Add other colors as needed
  },
  [MOCK_DARK_THEME]: {
    text: '#FFFFFF',
    background: '#000000',
    tint: '#0A84FF',
    // Add other colors as needed
  },
};

const Theme = {
  Light: MOCK_LIGHT_THEME,
  Dark: MOCK_DARK_THEME,
};

module.exports = {
  Colors: MOCK_COLORS,
  Theme,
  __esModule: true,
};
