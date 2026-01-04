// Mock for immer ES module
const immer = {
  produce: (base, recipe) => {
    if (typeof recipe === 'function') {
      // Create a deep clone to prevent mutations
      const draft = JSON.parse(JSON.stringify(base));
      const result = recipe(draft);
      return result !== undefined ? result : draft;
    }
    return base;
  },
  enableMapSet: () => {},
  setAutoFreeze: () => {},
  setUseProxies: () => {},
  original: (value) => value,
  isDraft: () => false,
  isDraftable: (value) => typeof value === 'object' && value !== null,
  current: (value) => value,
  createDraft: (base) => JSON.parse(JSON.stringify(base)), // Deep clone
  finishDraft: (draft) => draft,
  nothing: Symbol('nothing'),
  DRAFT_STATE: Symbol('draft-state'),
};

module.exports = immer;
