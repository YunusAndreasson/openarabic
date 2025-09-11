// Compatibility shim for expo-updates to find expo/config/paths
// Maps to the actual @expo/config/build/paths/paths module

let pathsModule;

try {
  // Try the new path first
  pathsModule = require('@expo/config/build/paths/paths');
} catch (error) {
  try {
    // Fallback to alternative paths if available
    pathsModule = require('@expo/config/build/paths');
  } catch (fallbackError) {
    console.warn('expo/config/paths compatibility shim: Could not load @expo/config paths module', error.message);
    // Provide minimal fallback exports
    pathsModule = {
      convertEntryPointToRelative: (entry) => entry,
      resolveEntryPoint: (entry) => entry,
      resolveRelativeEntryPoint: (entry) => entry,
      ensureSlash: (path) => path,
      getFileWithExtensions: (path) => path,
      getMetroServerRoot: () => process.cwd(),
      getMetroWorkspaceGlobs: () => [],
      getPossibleProjectRoot: () => process.cwd(),
    };
  }
}

module.exports = pathsModule;
