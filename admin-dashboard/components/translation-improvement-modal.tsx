import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, Sparkles, Save } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface WordTranslation {
  arabic: string;
  english: string;
  position: number;
  id: number; // word ID in database
}

interface TranslationSuggestion {
  position: number;
  arabic: string;
  currentEnglish: string;
  suggestedEnglish: string;
  reasoning?: string;
}

interface TranslationImprovementModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  arabicSentence: string;
  englishSentence: string;
  words: WordTranslation[];
  onSave: (wordId: number, newEnglish: string) => Promise<void>;
}

export function TranslationImprovementModal({
  open,
  onOpenChange,
  arabicSentence,
  englishSentence,
  words,
  onSave,
}: TranslationImprovementModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TranslationSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingWordIds, setSavingWordIds] = useState<Set<number>>(new Set());

  // Auto-load AI suggestions when modal opens
  useEffect(() => {
    if (open && suggestions.length === 0 && !isLoading && !error) {
      loadSuggestions();
    }
  }, [open]);

  const loadSuggestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/improve-translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arabicSentence,
          englishSentence,
          words: words.map((w) => ({
            arabic: w.arabic,
            english: w.english,
            position: w.position,
          })),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        const errorMsg = data.error || 'Failed to get translation suggestions';
        const debugInfo = data.rawResponse
          ? `\n\nAI Response Preview: ${data.rawResponse}`
          : '';
        console.error('API Error:', data);
        throw new Error(errorMsg + debugInfo);
      }

      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Error loading suggestions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveWord = async (wordId: number, newEnglish: string) => {
    setSavingWordIds((prev) => new Set(prev).add(wordId));
    try {
      await onSave(wordId, newEnglish);
      // Remove this suggestion from the list after successful save
      setSuggestions((prev) =>
        prev.filter((s) => {
          const word = words.find((w) => w.position === s.position);
          return word?.id !== wordId;
        })
      );
    } catch (err) {
      console.error('Error saving word:', err);
      alert('Failed to save translation');
    } finally {
      setSavingWordIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(wordId);
        return newSet;
      });
    }
  };

  const handleSaveAll = async () => {
    for (const suggestion of suggestions) {
      const word = words.find((w) => w.position === suggestion.position);
      if (word) {
        await handleSaveWord(word.id, suggestion.suggestedEnglish);
      }
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state when closing
    setTimeout(() => {
      setSuggestions([]);
      setError(null);
    }, 200);
  };

  // Create a merged view of all words with suggestions
  const wordsWithSuggestions = words.map((word) => {
    const suggestion = suggestions.find((s) => s.position === word.position);
    return {
      ...word,
      suggestion,
    };
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Translation Improvement
          </DialogTitle>
          <DialogDescription>
            Review AI suggestions for improved word-level translations
          </DialogDescription>
        </DialogHeader>

        {/* Sentence Context */}
        <div className="space-y-2 border-b pb-4">
          <div>
            <span className="text-sm font-semibold text-muted-foreground">Arabic:</span>
            <p className="text-lg font-arabic" dir="rtl">
              {arabicSentence}
            </p>
          </div>
          <div>
            <span className="text-sm font-semibold text-muted-foreground">English:</span>
            <p className="text-lg">{englishSentence}</p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Analyzing translations...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={loadSuggestions}
              className="mt-3 cursor-pointer"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Results Table */}
        {!isLoading && !error && suggestions.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Found {suggestions.length} improvement{suggestions.length !== 1 ? 's' : ''}
              </p>
              <Button
                onClick={handleSaveAll}
                size="sm"
                disabled={savingWordIds.size > 0}
                className="cursor-pointer"
              >
                <Save className="mr-2 h-4 w-4" />
                Save All
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Arabic</TableHead>
                    <TableHead>Current English</TableHead>
                    <TableHead>AI Suggestion</TableHead>
                    <TableHead>Reasoning</TableHead>
                    <TableHead className="w-24 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {wordsWithSuggestions
                    .filter((w) => w.suggestion)
                    .map((word) => {
                      const isSaving = savingWordIds.has(word.id);
                      return (
                        <TableRow key={word.id}>
                          <TableCell className="text-muted-foreground">
                            {word.position}
                          </TableCell>
                          <TableCell>
                            <span className="font-arabic text-lg" dir="rtl">
                              {word.arabic}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{word.english}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                              {word.suggestion?.suggestedEnglish}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs text-muted-foreground">
                              {word.suggestion?.reasoning || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              size="sm"
                              onClick={() =>
                                handleSaveWord(word.id, word.suggestion!.suggestedEnglish)
                              }
                              disabled={isSaving}
                              className="cursor-pointer"
                            >
                              {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* No Suggestions */}
        {!isLoading && !error && suggestions.length === 0 && (
          <div className="text-center py-12">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              All translations look good! No improvements needed.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="cursor-pointer">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
