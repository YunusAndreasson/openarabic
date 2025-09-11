// Compatibility shim for expo-updates to find expo/config/paths
// Provides minimal implementation without Node.js dependencies

// Minimal implementation of the functions expo-updates needs
const pathsModule = {
  convertEntryPointToRelative: (entryPoint) => {
    if (typeof entryPoint === 'string' && entryPoint.startsWith('./')) {
      return entryPoint;
    }
    return entryPoint;
  },

  resolveEntryPoint: (entryPoint) => {
    if (typeof entryPoint === 'string') {
      return entryPoint;
    }
    return './index';
  },

  resolveRelativeEntryPoint: (entryPoint) => {
    if (typeof entryPoint === 'string') {
      return entryPoint;
    }
    return './index';
  },

  ensureSlash: (inputPath) => {
    if (typeof inputPath === 'string') {
      return inputPath.replace(/\\/g, '/');
    }
    return inputPath;
  },

  getFileWithExtensions: (filePath) => {
    if (typeof filePath === 'string') {
      return filePath;
    }
    return '';
  },

  getMetroServerRoot: () => {
    return process.cwd();
  },

  getMetroWorkspaceGlobs: () => {
    return [];
  },

  getPossibleProjectRoot: () => {
    return process.cwd();
  }
};

module.exports = pathsModule;
