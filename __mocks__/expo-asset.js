module.exports = {
  Asset: {
    fromModule: mockStable(() => ({
      uri: 'test-asset-uri',
      width: 100,
      height: 100,
      downloadAsync: mockStable(() => Promise.resolve(undefined)),
    })),
    loadAsync: mockStable(() => Promise.resolve(undefined)),
  },
};
