import { listenAudioService } from '../../services/listenAudioService';
import type { StudyWord } from '../../types/vocabulary.types';

describe('listenAudioService', () => {
  const baseWord = (id: number): StudyWord => ({
    root_id: id,
    user_id: 'u1',
    created_at: '2024-01-01',
    root: {
      id,
      letters: `word${id}`,
      meaning: `meaning${id}`,
      audio_url: `ar${id}.mp3`,
      audio_url_en: `en${id}.mp3`,
    } as any,
  });

  describe('generateVocabularyTracks', () => {
    it('creates two tracks per word with audio', () => {
      const tracks = listenAudioService.generateVocabularyTracks([baseWord(1)]);
      expect(tracks).toHaveLength(2);
      expect(tracks[0]).toEqual(
        expect.objectContaining({ id: 'word-0-ar', rootId: 1, audioUrl: 'ar1.mp3' })
      );
      expect(tracks[1]).toEqual(
        expect.objectContaining({ id: 'word-0-en', rootId: 1, audioUrl: 'en1.mp3' })
      );
    });

    it('skips words missing audio', () => {
      const word = { ...baseWord(2), root: { id: 2 } as any };
      const tracks = listenAudioService.generateVocabularyTracks([word]);
      expect(tracks).toHaveLength(0);
    });
  });

  describe('getRandomVocabularyTracks', () => {
    it('returns tracks for a limited number of words', async () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5);
      const words = [baseWord(1), baseWord(2), baseWord(3)];
      const tracks = await listenAudioService.getRandomVocabularyTracks(words, 2);
      expect(tracks).toHaveLength(4); // two tracks per word
      const rootIds = Array.from(new Set(tracks.map(t => t.rootId)));
      expect(rootIds).toEqual([1, 2]);
      jest.restoreAllMocks();
    });

    it('returns empty array when aborted', async () => {
      const controller = new AbortController();
      controller.abort();
      const tracks = await listenAudioService.getRandomVocabularyTracks(
        [baseWord(1)],
        1,
        controller.signal
      );
      expect(tracks).toEqual([]);
    });
  });
});
