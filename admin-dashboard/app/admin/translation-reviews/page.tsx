'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AutoTextarea } from '@/components/ui/auto-textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Check, X, AlertCircle, FileText } from 'lucide-react';

interface SentenceWord {
  id: number;
  word_form: string;
  english: string;
  grammar_note: string | null;
  position: number;
  sentence_id: number;
  article_sentences: {
    id: number;
    arabic: string;
    english: string;
    position: number;
    article_id: number;
    articles: {
      id: number;
      title: string;
    } | null;
  } | null;
}

interface TranslationImprovement {
  id: number;
  sentence_word_id: number;
  suggested_english: string;
  suggested_grammar_note: string | null;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  sentence_words: SentenceWord;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
}

export default function TranslationReviewsPage() {
  const [improvements, setImprovements] = useState<TranslationImprovement[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());

  // Local edit states for inline editing
  const [editedEnglish, setEditedEnglish] = useState<Record<number, string>>({});
  const [editedGrammarNote, setEditedGrammarNote] = useState<Record<number, string | null>>({});

  useEffect(() => {
    fetchImprovements();
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const fetchImprovements = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/translation-improvements?status=${statusFilter}`);
      const result = await response.json();

      console.log('API Response:', result);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to fetch improvements';
        const detailsMsg = result.details ? `\n\nDetails: ${result.details}` : '';
        const fullErrorMsg = result.fullError ? `\n\nFull Error: ${result.fullError}` : '';
        throw new Error(errorMsg + detailsMsg + fullErrorMsg);
      }

      setImprovements(result.data || []);

      // Initialize edit states
      const initialEnglish: Record<number, string> = {};
      const initialGrammar: Record<number, string | null> = {};

      result.data?.forEach((imp: TranslationImprovement) => {
        initialEnglish[imp.id] = imp.suggested_english;
        initialGrammar[imp.id] = imp.suggested_grammar_note;
      });

      setEditedEnglish(initialEnglish);
      setEditedGrammarNote(initialGrammar);
    } catch (err) {
      console.error('Error fetching improvements:', err);
      setError(err instanceof Error ? err.message : 'Failed to load improvements');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/translation-improvements?status=pending'),
        fetch('/api/translation-improvements?status=approved'),
        fetch('/api/translation-improvements?status=rejected'),
      ]);

      const [pending, approved, rejected] = await Promise.all([
        pendingRes.json(),
        approvedRes.json(),
        rejectedRes.json(),
      ]);

      setStats({
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleAction = async (improvementId: number, action: 'approve' | 'reject') => {
    setProcessingIds(prev => new Set(prev).add(improvementId));

    try {
      const response = await fetch('/api/translation-improvements', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: improvementId,
          action,
          suggested_english: editedEnglish[improvementId],
          suggested_grammar_note: editedGrammarNote[improvementId],
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || `Failed to ${action} improvement`);
      }

      // Remove from current list
      setImprovements(prev => prev.filter(imp => imp.id !== improvementId));

      // Update stats
      fetchStats();

      // Clear edit states
      setEditedEnglish(prev => {
        const newState = { ...prev };
        delete newState[improvementId];
        return newState;
      });
      setEditedGrammarNote(prev => {
        const newState = { ...prev };
        delete newState[improvementId];
        return newState;
      });
    } catch (err) {
      console.error(`Error ${action}ing improvement:`, err);
      alert(err instanceof Error ? err.message : `Failed to ${action} improvement`);
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(improvementId);
        return newSet;
      });
    }
  };

  if (loading && improvements.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading translation reviews...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Word Translation Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve AI-suggested word translation improvements for sentences
        </p>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm">
        <div>
          <span className="font-bold text-orange-600">{stats.pending}</span>
          <span className="text-muted-foreground ml-1">Pending</span>
        </div>
        <div>
          <span className="font-bold text-green-600">{stats.approved}</span>
          <span className="text-muted-foreground ml-1">Approved</span>
        </div>
        <div>
          <span className="font-bold text-red-600">{stats.rejected}</span>
          <span className="text-muted-foreground ml-1">Rejected</span>
        </div>
      </div>

      {/* Filter */}
      <div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-2 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchImprovements}
            className="ml-auto cursor-pointer"
          >
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Sentence</TableHead>
                <TableHead className="w-32">Arabic Word</TableHead>
                <TableHead className="w-[300px]">English Translation</TableHead>
                <TableHead className="w-[390px]">Grammar Notes</TableHead>
                {statusFilter === 'pending' && (
                  <TableHead className="w-16 text-center">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {improvements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No {statusFilter} improvements found
                  </TableCell>
                </TableRow>
              ) : (
                improvements.map((improvement, index) => {
                  const isProcessing = processingIds.has(improvement.id);
                  const word = improvement.sentence_words;
                  const sentence = word.article_sentences;

                  return (
                    <TableRow key={improvement.id} className={isProcessing ? 'opacity-50' : ''}>
                      <TableCell className="text-muted-foreground align-top">{index + 1}</TableCell>

                      {/* Sentence English */}
                      <TableCell className="align-top">
                        <div className="text-sm text-muted-foreground">
                          {sentence?.english || '—'}
                        </div>
                      </TableCell>

                      {/* Arabic Word */}
                      <TableCell className="align-top">
                        <div className="text-2xl font-bold" dir="rtl">
                          {word.word_form}
                        </div>
                      </TableCell>

                      {/* English Translation */}
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-3">
                          {/* Current English */}
                          <div className="text-sm text-muted-foreground border-l-2 border-muted pl-2 min-h-[24px]">
                            {word.english}
                          </div>

                          {/* New English (Editable) */}
                          <Input
                            value={editedEnglish[improvement.id] || ''}
                            onChange={e =>
                              setEditedEnglish(prev => ({
                                ...prev,
                                [improvement.id]: e.target.value,
                              }))
                            }
                            disabled={isProcessing || statusFilter !== 'pending'}
                            placeholder="Enter improved translation..."
                            className="text-sm font-medium bg-muted/50"
                          />
                        </div>
                      </TableCell>

                      {/* Grammar Notes (Stacked) */}
                      <TableCell className="align-top">
                        <div className="flex flex-col gap-3">
                          {/* Current Grammar Note */}
                          <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words border-l-2 border-muted pl-2 min-h-[24px]">
                            {word.grammar_note || (
                              <span className="opacity-50">No existing grammar note</span>
                            )}
                          </div>

                          {/* New Grammar Note (Editable) */}
                          <AutoTextarea
                            value={editedGrammarNote[improvement.id] || ''}
                            onChange={e =>
                              setEditedGrammarNote(prev => ({
                                ...prev,
                                [improvement.id]: e.target.value || null,
                              }))
                            }
                            disabled={isProcessing || statusFilter !== 'pending'}
                            placeholder="Add grammar note (e.g., verb form, case, tense)..."
                            minRows={2}
                            className="text-sm bg-muted/50"
                          />
                        </div>
                      </TableCell>

                      {/* Actions */}
                      {statusFilter === 'pending' && (
                        <TableCell className="align-top">
                          <div className="flex flex-col gap-2 items-center">
                            <Button
                              size="sm"
                              onClick={() => handleAction(improvement.id, 'approve')}
                              disabled={isProcessing}
                              className="cursor-pointer bg-green-600 hover:bg-green-700 p-2 h-8 w-8"
                            >
                              {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleAction(improvement.id, 'reject')}
                              disabled={isProcessing}
                              className="cursor-pointer p-2 h-8 w-8"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
