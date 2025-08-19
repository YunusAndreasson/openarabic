module.exports = {
  ensurePeerDeps: () => {
    // Bypass strict peer dependency check for react-test-renderer
    // This allows tests to run with React 19 + react-test-renderer 19.0.0
    return true;
  },
};
