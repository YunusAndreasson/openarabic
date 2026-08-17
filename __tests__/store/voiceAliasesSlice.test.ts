import reducer, { rememberAlias, type VoiceAliasesState } from '../../store/voiceAliasesSlice';
import { MAX_ALIASES_PER_ROOT } from '../../utils/voiceAliases';

describe('voiceAliasesSlice', () => {
  let initialState: VoiceAliasesState;

  beforeEach(() => {
    initialState = { byRoot: {} };
  });

  describe('rememberAlias', () => {
    it('stores a normalized transcript under its root', () => {
      const state = reducer(initialState, rememberAlias({ rootId: 8852, transcript: 'Linear.' }));
      expect(state.byRoot['8852']).toEqual(['linear']);
    });

    it('keeps several transcripts for the same word', () => {
      let state = reducer(initialState, rememberAlias({ rootId: 8852, transcript: 'Linear.' }));
      state = reducer(state, rememberAlias({ rootId: 8852, transcript: 'Linach.' }));
      expect(state.byRoot['8852']).toEqual(['linear', 'linach']);
    });

    it('does not duplicate a transcript it already knows', () => {
      let state = reducer(initialState, rememberAlias({ rootId: 8852, transcript: 'Linear.' }));
      state = reducer(state, rememberAlias({ rootId: 8852, transcript: 'linear' }));
      expect(state.byRoot['8852']).toEqual(['linear']);
    });

    it('keeps words apart', () => {
      let state = reducer(initialState, rememberAlias({ rootId: 8852, transcript: 'Linear.' }));
      state = reducer(state, rememberAlias({ rootId: 5502, transcript: 'on her' }));
      expect(state.byRoot).toEqual({ '8852': ['linear'], '5502': ['on her'] });
    });

    it('caps a single word`s list', () => {
      let state = initialState;
      for (let i = 0; i < MAX_ALIASES_PER_ROOT + 2; i++) {
        state = reducer(state, rememberAlias({ rootId: 8852, transcript: `heard ${i}` }));
      }
      expect(state.byRoot['8852']).toHaveLength(MAX_ALIASES_PER_ROOT);
    });

    it('ignores an empty transcript', () => {
      // The caller gates on isAliasStorable, but the reducer is the last line
      // and must not create an empty entry that would match nothing forever.
      const state = reducer(initialState, rememberAlias({ rootId: 8852, transcript: '  ' }));
      expect(state.byRoot['8852']).toBeUndefined();
    });
  });
});
