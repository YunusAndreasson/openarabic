/**
 * useWordAudioPlayback Hook Tests
 *
 * Tests word audio playback with haptics and error handling.
 *
 * Modern Jest 29 Patterns:
 * - ✅ @jest/globals explicit imports
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { describe, expect, test, jest, beforeEach } from '@jest/globals';

import { useWordAudioPlayback } from '@/hooks/audio/useWordAudioPlayback';
import type { WordAudioData } from '@/utils/audioUtils';

// Mock dependencies
const mockPlay = jest.fn(async (..._args: unknown[]) => undefined);
jest.mock('@/hooks/audio/useSimpleAudioPlayer', () => ({
  useSimpleAudioPlayer: () => ({
    play: mockPlay,
  }),
}));

jest.mock('@/hooks/common/useMountSafety', () => ({
  useMountSafety: () => ({ current: true }),
}));

const mockHandleError = jest.fn();
jest.mock('@/utils/errorHandling', () => ({
  handleError: (...args: unknown[]) => mockHandleError(...args),
}));

const mockGenerateWordAudioTrack = jest.fn<(...args: unknown[]) => Promise<unknown>>();
jest.mock('@/utils/audioUtils', () => ({
  generateWordAudioTrack: (...args: unknown[]) => mockGenerateWordAudioTrack(...args),
}));

describe('useWordAudioPlayback', () => {
  const mockWord: WordAudioData = {
    id: 42,
    letters: 'كتب',
    meaning: 'to write',
    audio_url: 'https://example.com/audio.mp3',
    audio_url_en: 'https://example.com/audio_en.mp3',
  };

  const mockTrack = {
    url: 'https://example.com/audio.mp3',
    title: 'كتب',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateWordAudioTrack.mockResolvedValue(mockTrack);
    mockPlay.mockResolvedValue(undefined);
  });

  describe('Basic Functionality', () => {
    test('returns a playback function', () => {
      const { result } = renderHook(() => useWordAudioPlayback());
      expect(typeof result.current).toBe('function');
    });

    test('generates audio track and plays it', async () => {
      const { result } = renderHook(() => useWordAudioPlayback());

      await act(async () => {
        await result.current(mockWord);
      });

      expect(mockGenerateWordAudioTrack).toHaveBeenCalledWith(mockWord);
      expect(mockPlay).toHaveBeenCalledWith(mockTrack);
    });
  });

  describe('Error Handling', () => {
    test('handles playback errors gracefully', async () => {
      const error = new Error('Playback failed');
      mockPlay.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWordAudioPlayback());

      await act(async () => {
        await result.current(mockWord);
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          showToast: false,
        }),
      );
    });

    test('shows toast on error when configured', async () => {
      const error = new Error('Playback failed');
      mockPlay.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWordAudioPlayback({ showErrorToast: true }));

      await act(async () => {
        await result.current(mockWord);
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          showToast: true,
        }),
      );
    });

    test('uses default error message', async () => {
      const error = new Error('Playback failed');
      mockPlay.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useWordAudioPlayback());

      await act(async () => {
        await result.current(mockWord);
      });

      expect(mockHandleError).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          toastMessage: 'Word audio playback failed',
        }),
      );
    });
  });

  describe('No Audio Track', () => {
    test('does not play when no track is generated', async () => {
      mockGenerateWordAudioTrack.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useWordAudioPlayback());

      await act(async () => {
        await result.current(mockWord);
      });

      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  describe('Options', () => {
    test('accepts showErrorToast option', () => {
      const { result } = renderHook(() =>
        useWordAudioPlayback({
          showErrorToast: true,
        }),
      );

      expect(typeof result.current).toBe('function');
    });

    test('uses default options when none provided', () => {
      const { result } = renderHook(() => useWordAudioPlayback());

      // Default behavior - function should work
      expect(typeof result.current).toBe('function');
    });
  });
});
