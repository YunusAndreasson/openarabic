module.exports = {
  Asset: {
    fromModule: jest.fn(() => ({
      uri: 'test-asset-uri',
      width: 100,
      height: 100,
      downloadAsync: jest.fn().mockResolvedValue(undefined),
    })),
    loadAsync: jest.fn().mockResolvedValue(undefined),
  },
};
