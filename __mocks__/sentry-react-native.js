module.exports = {
  captureException: () => {},
  withScope: callback => callback({ setLevel: () => {} }),
};
