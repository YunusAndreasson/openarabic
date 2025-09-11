// Main expo module compatibility shim
// Minimal implementation to avoid Node.js dependencies
module.exports = {
  getConfig: () => ({}),
  getNameFromConfig: () => 'OpenArabic',
  getProjectConfigDescription: () => ({}),
  // Add other commonly used functions as needed
};
