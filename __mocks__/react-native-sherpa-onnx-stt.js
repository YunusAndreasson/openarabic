module.exports = {
  __esModule: true,
  createSTT: jest.fn().mockResolvedValue({
    transcribeSamples: jest.fn().mockResolvedValue({ text: '' }),
    destroy: jest.fn().mockResolvedValue(undefined),
  }),
};
