module.exports = {
  __esModule: true,
  ModelCategory: { Stt: 'stt' },
  ensureModelByCategory: jest.fn().mockResolvedValue({ localPath: '/mock/model/path' }),
  refreshModelsByCategory: jest.fn().mockResolvedValue(undefined),
};
