'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Play, Pause, Loader2, Volume2, AlertCircle, Edit, Save, X } from 'lucide-react';

type Sentence = Database['public']['Tables']['article_sentences']['Row'];

type AudioType = 'arabic' | 'english' | 'bilingual';

interface SentenceAudioVerifierProps {
  articleId: number;
}

const SUPABASE_AUDIO_URL =
  'https://kkmnzbeugdoajtzfjkxg.supabase.co/storage/v1/object/public/audio/';

function normalizeAudioUrl(audioUrl: string): string {
  if (!audioUrl) return '';

  // If it's already a full URL, return it
  if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
    return audioUrl;
  }

  // If it's just a filename, prepend the storage URL
  return SUPABASE_AUDIO_URL + audioUrl;
}

export function SentenceAudioVerifier({ articleId }: SentenceAudioVerifierProps) {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingState, setPlayingState] = useState<{
    sentenceId: number | null;
    audioType: AudioType | null;
  }>({ sentenceId: null, audioType: null });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});

  useEffect(() => {
    fetchSentences();
  }, [articleId]);

  const fetchSentences = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('article_sentences')
        .select('*')
        .eq('article_id', articleId)
        .order('position');

      if (fetchError) throw fetchError;

      setSentences(data || []);
    } catch (err) {
      console.error('Error fetching sentences:', err);
      setError('Failed to load sentences. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sentence: Sentence) => {
    setEditingId(sentence.id);
    setEditedText(sentence.english);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedText('');
  };

  const handleSave = async (sentenceId: number) => {
    if (!editedText.trim()) {
      alert('English text cannot be empty');
      return;
    }

    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('article_sentences')
        .update({ english: editedText })
        .eq('id', sentenceId);

      if (updateError) throw updateError;

      // Update local state
      setSentences((prevSentences) =>
        prevSentences.map((s) =>
          s.id === sentenceId ? { ...s, english: editedText } : s
        )
      );

      setEditingId(null);
      setEditedText('');
    } catch (err) {
      console.error('Error saving sentence:', err);
      alert('Failed to save sentence. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const stopAllAudio = () => {
    Object.values(audioRefs.current).forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    setPlayingState({ sentenceId: null, audioType: null });
  };

  const handlePlayPause = (sentenceId: number, audioType: AudioType, audioUrl: string) => {
    const audioKey = `${sentenceId}-${audioType}`;
    const isCurrentlyPlaying =
      playingState.sentenceId === sentenceId && playingState.audioType === audioType;

    // Stop all other audio
    stopAllAudio();

    if (isCurrentlyPlaying) {
      // Already playing this one, so we've stopped it above
      return;
    }

    // Create audio element if it doesn't exist
    if (!audioRefs.current[audioKey]) {
      const audio = new Audio(audioUrl);
      audio.addEventListener('ended', () => {
        setPlayingState({ sentenceId: null, audioType: null });
      });
      audio.addEventListener('error', () => {
        console.error(`Error loading audio: ${audioUrl}`);
        setPlayingState({ sentenceId: null, audioType: null });
      });
      audioRefs.current[audioKey] = audio;
    }

    // Play the audio
    const audio = audioRefs.current[audioKey];
    audio.play().catch((err) => {
      console.error('Error playing audio:', err);
      setPlayingState({ sentenceId: null, audioType: null });
    });

    setPlayingState({ sentenceId, audioType });
  };

  const isPlaying = (sentenceId: number, audioType: AudioType) => {
    return playingState.sentenceId === sentenceId && playingState.audioType === audioType;
  };

  const getAudioButtonVariant = (sentenceId: number, audioType: AudioType) => {
    return isPlaying(sentenceId, audioType) ? 'default' : 'outline';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading sentences...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchSentences} className="ml-auto">
          Retry
        </Button>
      </div>
    );
  }

  if (sentences.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">No sentences found for this article.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Sentence Audio Verification</h3>
        <span className="text-sm text-muted-foreground">({sentences.length} sentences)</span>
      </div>

      <div className="space-y-3">
        {sentences.map((sentence, index) => (
          <div
            key={sentence.id}
            className="p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-xs font-medium text-primary">{index + 1}</span>
              </div>

              <div className="flex-1 space-y-2">
                {/* English Text */}
                <div className="text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase">
                      English:
                    </span>
                    {editingId !== sentence.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(sentence)}
                        className="h-6 px-2"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {editingId === sentence.id ? (
                    <div className="space-y-2">
                      <Textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="min-h-[80px]"
                        disabled={saving}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(sentence.id)}
                          disabled={saving}
                        >
                          {saving ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3 mr-1" />
                          )}
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-foreground">{sentence.english}</p>
                  )}
                </div>

                {/* Arabic Text (RTL) */}
                <div className="text-sm">
                  <span className="text-xs font-medium text-muted-foreground uppercase">
                    Arabic:
                  </span>
                  <p className="mt-1 text-foreground text-right text-3xl font-medium" dir="rtl">
                    {sentence.arabic}
                  </p>
                </div>

                {/* Audio Playback Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant={getAudioButtonVariant(sentence.id, 'arabic')}
                    onClick={() =>
                      handlePlayPause(
                        sentence.id,
                        'arabic',
                        normalizeAudioUrl(sentence.audio_url)
                      )
                    }
                    className="flex-1"
                  >
                    {isPlaying(sentence.id, 'arabic') ? (
                      <Pause className="mr-2 h-3 w-3" />
                    ) : (
                      <Play className="mr-2 h-3 w-3" />
                    )}
                    Arabic
                  </Button>

                  <Button
                    size="sm"
                    variant={getAudioButtonVariant(sentence.id, 'english')}
                    onClick={() =>
                      handlePlayPause(
                        sentence.id,
                        'english',
                        normalizeAudioUrl(sentence.audio_url_english)
                      )
                    }
                    className="flex-1"
                  >
                    {isPlaying(sentence.id, 'english') ? (
                      <Pause className="mr-2 h-3 w-3" />
                    ) : (
                      <Play className="mr-2 h-3 w-3" />
                    )}
                    English
                  </Button>

                  <Button
                    size="sm"
                    variant={getAudioButtonVariant(sentence.id, 'bilingual')}
                    onClick={() =>
                      handlePlayPause(
                        sentence.id,
                        'bilingual',
                        normalizeAudioUrl(sentence.audio_url_bilingual)
                      )
                    }
                    className="flex-1"
                  >
                    {isPlaying(sentence.id, 'bilingual') ? (
                      <Pause className="mr-2 h-3 w-3" />
                    ) : (
                      <Play className="mr-2 h-3 w-3" />
                    )}
                    Bilingual
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {playingState.sentenceId && (
        <div className="sticky bottom-4 left-0 right-0 flex justify-center">
          <Button variant="secondary" size="sm" onClick={stopAllAudio}>
            <Pause className="mr-2 h-4 w-4" />
            Stop All Audio
          </Button>
        </div>
      )}
    </div>
  );
}
