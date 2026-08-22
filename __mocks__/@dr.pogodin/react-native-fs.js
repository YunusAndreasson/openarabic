/**
 * The real package ships untransformed ESM, so it cannot be required under this
 * Jest config. Only the surface the app actually touches is mocked.
 *
 * Bare `jest.fn()`s — `resetMocks: true` would strip any implementation set
 * here. `DocumentDirectoryPath` is a plain string, so it survives.
 */
module.exports = {
  __esModule: true,
  DocumentDirectoryPath: '/mock/documents',
  mkdir: jest.fn(),
  exists: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn(),
};
