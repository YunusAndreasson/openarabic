'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Play, Pause, Loader2, Volume2, AlertCircle, Edit, Save, X, Sparkles } from 'lucide-react';
import { useGlobalTranslationCache } from '@/hooks/useGlobalTranslationCache';
import { TranslationImprovementModal } from './translation-improvement-modal';

type Sentence = Database['public']['Tables']['article_sentences']['Row'];
type SentenceWord = Database['public']['Tables']['sentence_words']['Row'];

type SentenceWithWords = Sentence & {
  sentence_words?: SentenceWord[];
};

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

// Clickable Arabic word component
const ArabicWord = React.memo(
  ({
    word,
    onClick,
    onHover,
    onLeave,
    hasAlternatives,
  }: {
    word: SentenceWord;
    onClick: (word: SentenceWord, e: React.MouseEvent) => void;
    onHover: (word: SentenceWord, e: React.MouseEvent) => void;
    onLeave: () => void;
    hasAlternatives: boolean;
  }) => {
    return (
      <span className="relative inline-block">
        <span
          onClick={(e) => onClick(word, e)}
          onMouseEnter={(e) => onHover(word, e)}
          onMouseLeave={onLeave}
          className={`cursor-pointer rounded px-0.5 transition-colors ${
            hasAlternatives
              ? 'bg-orange-100 hover:bg-orange-200'
              : 'hover:bg-primary/10'
          }`}
        >
          {word.word_form}
        </span>
      </span>
    );
  }
);
ArabicWord.displayName = 'ArabicWord';

export function SentenceAudioVerifier({ articleId }: SentenceAudioVerifierProps) {
  const [sentences, setSentences] = useState<SentenceWithWords[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playingState, setPlayingState] = useState<{
    sentenceId: number | null;
    audioType: AudioType | null;
  }>({ sentenceId: null, audioType: null });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editedText, setEditedText] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [selectedWord, setSelectedWord] = useState<{
    word: SentenceWord;
    position: { x: number; y: number };
    alternativeTranslations: string[];
  } | null>(null);
  const [savingTranslation, setSavingTranslation] = useState(false);
  const [customTranslation, setCustomTranslation] = useState('');
  const [hoveredWord, setHoveredWord] = useState<{
    word: SentenceWord;
    position: { x: number; y: number };
  } | null>(null);
  const [improvementModalOpen, setImprovementModalOpen] = useState(false);
  const [selectedSentenceForImprovement, setSelectedSentenceForImprovement] =
    useState<SentenceWithWords | null>(null);

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Use global translation cache instead of local fetching
  const { translationsMap, refresh: refreshCache } = useGlobalTranslationCache();

  // Pre-calculate which words have alternative translations (performance optimization)
  const wordsWithAlternatives = useMemo(() => {
    const wordIds = new Set<number>();

    sentences.forEach((sentence) => {
      sentence.sentence_words?.forEach((word) => {
        const translations = translationsMap.get(word.word_form);
        if (!translations) return;

        const currentWordCount = word.english.trim().split(/\s+/).length;
        if (currentWordCount !== 1) return;

        const hasAlternatives = Array.from(translations).some((translation) => {
          const wordCount = translation.trim().split(/\s+/).length;
          return translation !== word.english.trim() && wordCount >= 2;
        });

        if (hasAlternatives) {
          wordIds.add(word.id);
        }
      });
    });

    return wordIds;
  }, [sentences, translationsMap]);

  useEffect(() => {
    fetchSentences();
  }, [articleId]);

  // Close tooltip on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectedWord && tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setSelectedWord(null);
        setCustomTranslation('');
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [selectedWord]);

  const fetchSentences = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('article_sentences')
        .select(`
          *,
          sentence_words (
            id,
            word_form,
            english,
            position,
            grammar_note
          )
        `)
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

  const handleToggleRepeat = async (
    sentenceId: number,
    field: 'english_repeat' | 'arabic_repeat',
    currentValue: boolean | null
  ) => {
    try {
      const newValue = !currentValue;

      const { error: updateError } = await supabase
        .from('article_sentences')
        .update({ [field]: newValue })
        .eq('id', sentenceId);

      if (updateError) throw updateError;

      // Update local state
      setSentences((prevSentences) =>
        prevSentences.map((s) =>
          s.id === sentenceId ? { ...s, [field]: newValue } : s
        )
      );

      console.log(`✓ Updated ${field} to ${newValue} for sentence ${sentenceId}`);
    } catch (err) {
      console.error(`Error toggling ${field}:`, err);
      alert(`Failed to update ${field}. Please try again.`);
    }
  };

  // Check if word has alternative multi-word translations using global cache
  const getAlternativeTranslations = (word: SentenceWord): string[] => {
    const translations = translationsMap.get(word.word_form);
    if (!translations) return [];

    const currentWordCount = word.english.trim().split(/\s+/).length;

    // Only look for alternatives if current translation is single word
    if (currentWordCount !== 1) return [];

    // Get all translations with 2+ words that are different from current
    return Array.from(translations).filter((translation) => {
      const wordCount = translation.trim().split(/\s+/).length;
      return translation !== word.english.trim() && wordCount >= 2;
    });
  };

  const hasAlternativeTranslations = useCallback(
    (word: SentenceWord): boolean => {
      return wordsWithAlternatives.has(word.id);
    },
    [wordsWithAlternatives]
  );

  const handleWordHover = useCallback((word: SentenceWord, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setHoveredWord({
      word,
      position: {
        x: rect.left + rect.width / 2,
        y: rect.top,
      },
    });
  }, []);

  const handleWordLeave = useCallback(() => {
    setHoveredWord(null);
  }, []);

  const handleWordClick = useCallback(
    (word: SentenceWord, e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = (e.target as HTMLElement).getBoundingClientRect();
      const alternatives = getAlternativeTranslations(word);

      setSelectedWord({
        word,
        position: {
          x: rect.left + rect.width / 2,
          y: rect.top,
        },
        alternativeTranslations: alternatives,
      });
      setCustomTranslation(word.english);
      setHoveredWord(null); // Hide hover tooltip when opening edit popup
    },
    [getAlternativeTranslations]
  );

  const handleSaveCustomSingle = async () => {
    if (!selectedWord || !customTranslation.trim()) {
      alert('Translation cannot be empty');
      return;
    }

    setSavingTranslation(true);
    try {
      const { error: updateError } = await supabase
        .from('sentence_words')
        .update({ english: customTranslation.trim() })
        .eq('id', selectedWord.word.id);

      if (updateError) throw updateError;

      // Update local state
      setSentences((prevSentences) =>
        prevSentences.map((sentence) => ({
          ...sentence,
          sentence_words: sentence.sentence_words?.map((w) =>
            w.id === selectedWord.word.id ? { ...w, english: customTranslation.trim() } : w
          ),
        }))
      );

      // Refresh global cache
      await refreshCache();

      setSelectedWord(null);
      setCustomTranslation('');

      console.log(`✓ Updated single word instance (ID: ${selectedWord.word.id})`);
    } catch (err) {
      console.error('Error saving custom translation:', err);
      alert('Failed to save translation. Please try again.');
    } finally {
      setSavingTranslation(false);
    }
  };

  const handleSaveCustomGlobal = async () => {
    if (!selectedWord || !customTranslation.trim()) {
      alert('Translation cannot be empty');
      return;
    }

    const wordForm = selectedWord.word.word_form;
    const confirmed = confirm(
      `This will update ALL instances of "${wordForm}" across all articles. Continue?`
    );

    if (!confirmed) return;

    setSavingTranslation(true);
    try {
      const { error: updateError, count } = await supabase
        .from('sentence_words')
        .update({ english: customTranslation.trim() })
        .eq('word_form', wordForm);

      if (updateError) throw updateError;

      // Update local state for all matching words in current article
      setSentences((prevSentences) =>
        prevSentences.map((sentence) => ({
          ...sentence,
          sentence_words: sentence.sentence_words?.map((w) =>
            w.word_form === wordForm ? { ...w, english: customTranslation.trim() } : w
          ),
        }))
      );

      // Refresh global cache
      await refreshCache();

      setSelectedWord(null);
      setCustomTranslation('');

      console.log(`✓ Updated ${count || 0} words globally with word_form: "${wordForm}"`);
      alert(`Successfully updated ${count || 0} word instances globally.`);
    } catch (err) {
      console.error('Error saving custom translation globally:', err);
      alert('Failed to save translation. Please try again.');
    } finally {
      setSavingTranslation(false);
    }
  };

  const handleSaveTranslation = async (wordId: number, newTranslation: string) => {
    setSavingTranslation(true);
    try {
      const { error: updateError } = await supabase
        .from('sentence_words')
        .update({ english: newTranslation })
        .eq('id', wordId);

      if (updateError) throw updateError;

      // Update local state
      setSentences((prevSentences) =>
        prevSentences.map((sentence) => ({
          ...sentence,
          sentence_words: sentence.sentence_words?.map((w) =>
            w.id === wordId ? { ...w, english: newTranslation } : w
          ),
        }))
      );

      // Refresh global cache to get updated translations
      await refreshCache();

      setSelectedWord(null);
    } catch (err) {
      console.error('Error saving translation:', err);
      alert('Failed to save translation. Please try again.');
    } finally {
      setSavingTranslation(false);
    }
  };

  const handleOpenImprovementModal = (sentence: SentenceWithWords) => {
    setSelectedSentenceForImprovement(sentence);
    setImprovementModalOpen(true);
  };

  const handleSaveImprovement = async (wordId: number, newEnglish: string) => {
    // Use the existing handleSaveTranslation function
    await handleSaveTranslation(wordId, newEnglish);
  };

  const renderArabicWords = (sentence: SentenceWithWords) => {
    if (!sentence.sentence_words || sentence.sentence_words.length === 0) {
      return sentence.arabic;
    }

    // Sort words by position for proper order
    const sortedWords = [...sentence.sentence_words].sort((a, b) => a.position - b.position);

    return (
      <span className="inline-flex flex-wrap gap-1" dir="rtl">
        {sortedWords.map((word) => (
          <ArabicWord
            key={word.id}
            word={word}
            onClick={handleWordClick}
            onHover={handleWordHover}
            onLeave={handleWordLeave}
            hasAlternatives={hasAlternativeTranslations(word)}
          />
        ))}
      </span>
    );
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
        <Button variant="outline" size="sm" onClick={fetchSentences} className="ml-auto cursor-pointer">
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
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenImprovementModal(sentence)}
                          className="h-6 px-2 cursor-pointer"
                          title="Improve translations with AI"
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Improve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(sentence)}
                          className="h-6 px-2 cursor-pointer"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
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
                          className="cursor-pointer"
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
                          className="cursor-pointer"
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
                  <div className="text-foreground text-right text-3xl font-medium leading-loose">
                    {renderArabicWords(sentence)}
                  </div>
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
                    className="flex-1 cursor-pointer"
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
                    className="flex-1 cursor-pointer"
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
                    className="flex-1 cursor-pointer"
                  >
                    {isPlaying(sentence.id, 'bilingual') ? (
                      <Pause className="mr-2 h-3 w-3" />
                    ) : (
                      <Play className="mr-2 h-3 w-3" />
                    )}
                    Bilingual
                  </Button>
                </div>

                {/* Repeat Controls */}
                <div className="flex gap-4 pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sentence.english_repeat || false}
                      onChange={() =>
                        handleToggleRepeat(
                          sentence.id,
                          'english_repeat',
                          sentence.english_repeat
                        )
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">Repeat English</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sentence.arabic_repeat || false}
                      onChange={() =>
                        handleToggleRepeat(
                          sentence.id,
                          'arabic_repeat',
                          sentence.arabic_repeat
                        )
                      }
                      className="w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">Repeat Arabic</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {playingState.sentenceId && (
        <div className="sticky bottom-4 left-0 right-0 flex justify-center">
          <Button variant="secondary" size="sm" onClick={stopAllAudio} className="cursor-pointer">
            <Pause className="mr-2 h-4 w-4" />
            Stop All Audio
          </Button>
        </div>
      )}

      {/* Word Translation Tooltip */}
      {selectedWord && (
        <div
          ref={tooltipRef}
          className="fixed z-50 bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 max-w-sm transition-none"
          style={{
            left: `${selectedWord.position.x}px`,
            top: `${selectedWord.position.y - 10}px`,
            transform: 'translate(-50%, -100%)',
            animation: 'none',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-3">
            <div>
              <span className="text-xs text-muted-foreground">Arabic:</span>
              <p className="text-2xl font-semibold" dir="rtl">
                {selectedWord.word.word_form}
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Current Translation:</span>
              <p className="text-base font-medium">{selectedWord.word.english}</p>
            </div>
            {selectedWord.word.grammar_note && (
              <div>
                <span className="text-xs text-muted-foreground">Grammar:</span>
                <p className="text-sm italic">{selectedWord.word.grammar_note}</p>
              </div>
            )}

            {/* Custom Translation Editor */}
            <div className="pt-2 border-t space-y-2">
              <div>
                <span className="text-xs font-medium text-blue-600 uppercase">
                  Edit Translation
                </span>
              </div>
              <Input
                value={customTranslation}
                onChange={(e) => setCustomTranslation(e.target.value)}
                placeholder="Enter translation..."
                disabled={savingTranslation}
                className="w-full"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveCustomSingle}
                  disabled={savingTranslation || !customTranslation.trim()}
                  className="cursor-pointer"
                >
                  {savingTranslation ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3 w-3" />
                  )}
                  This Word
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={handleSaveCustomGlobal}
                  disabled={savingTranslation || !customTranslation.trim()}
                  className="cursor-pointer"
                >
                  {savingTranslation ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="mr-1 h-3 w-3" />
                  )}
                  All Similar
                </Button>
              </div>
            </div>

            {selectedWord.alternativeTranslations.length > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1 mb-2">
                  <span className="text-xs font-medium text-orange-600 uppercase">
                    Alternative Translations
                  </span>
                  <span className="w-2 h-2 bg-orange-400 rounded-full" />
                </div>
                <div className="space-y-1">
                  {selectedWord.alternativeTranslations.map((translation, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSaveTranslation(selectedWord.word.id, translation)}
                      disabled={savingTranslation}
                      className="w-full text-left px-2 py-1.5 text-sm rounded border border-orange-200 hover:bg-orange-50 hover:border-orange-400 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="font-medium">{translation}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        (Click to use)
                      </span>
                    </button>
                  ))}
                </div>
                {savingTranslation && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Saving translation...
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={() => setSelectedWord(null)}
            className="absolute -top-2 -right-2 bg-background border rounded-full w-6 h-6 flex items-center justify-center hover:bg-accent cursor-pointer"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Instant Hover Tooltip */}
      {hoveredWord && !selectedWord && (
        <div
          className="fixed z-40 bg-gray-900 text-white px-2 py-1 rounded text-sm pointer-events-none"
          style={{
            left: `${hoveredWord.position.x}px`,
            top: `${hoveredWord.position.y - 10}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          {hoveredWord.word.english}
        </div>
      )}

      {/* Translation Improvement Modal */}
      {selectedSentenceForImprovement && (
        <TranslationImprovementModal
          open={improvementModalOpen}
          onOpenChange={setImprovementModalOpen}
          arabicSentence={selectedSentenceForImprovement.arabic}
          englishSentence={selectedSentenceForImprovement.english}
          words={
            selectedSentenceForImprovement.sentence_words?.map((w) => ({
              arabic: w.arabic,
              english: w.english,
              position: w.position,
              id: w.id,
            })) || []
          }
          onSave={handleSaveImprovement}
        />
      )}
    </div>
  );
}
