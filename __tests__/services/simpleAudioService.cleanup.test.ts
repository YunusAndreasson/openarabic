jest.mock('expo-audio', () => {
  const mockPlayer = {
    play: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
    playing: true,
    currentTime: 1,
    duration: 2,
  };
  return {
    createAudioPlayer: jest.fn(() => mockPlayer),
    setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    __mocks: { mockPlayer },
  };
});

import { simpleAudioService } from '@/services/simpleAudioService';

describe('simpleAudioService - cleanup', () => {
  it('allows clean re-initialization after destroy', async () => {
    const { createAudioPlayer } = require('expo-audio');
    const track1 = { id: 't1', articleId: 1, audioUrl: 'u1', title: 't1' };
    const track2 = { id: 't2', articleId: 2, audioUrl: 'u2', title: 't2' };

    await simpleAudioService.play(track1);
    expect(createAudioPlayer).toHaveBeenCalledWith('u1');

    await simpleAudioService.destroy();

    await simpleAudioService.play(track2);
    expect(createAudioPlayer).toHaveBeenCalledWith('u2');
  });
});
