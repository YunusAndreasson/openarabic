'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Loader2, Check, X, AlertCircle, FileText, ExternalLink } from 'lucide-react';

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
  const [reviewerNotes, setReviewerNotes] = useState<Record<number, string>>({});

  useEffect(() => {
    fetchImprovements();
    fetchStats();
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
    setProcessingIds((prev) => new Set(prev).add(improvementId));

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
          reviewer_notes: reviewerNotes[improvementId] || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || `Failed to ${action} improvement`);
      }

      // Remove from current list
      setImprovements((prev) => prev.filter((imp) => imp.id !== improvementId));

      // Update stats
      fetchStats();

      // Clear edit states
      setEditedEnglish((prev) => {
        const newState = { ...prev };
        delete newState[improvementId];
        return newState;
      });
      setEditedGrammarNote((prev) => {
        const newState = { ...prev };
        delete newState[improvementId];
        return newState;
      });
      setReviewerNotes((prev) => {
        const newState = { ...prev };
        delete newState[improvementId];
        return newState;
      });
    } catch (err) {
      console.error(`Error ${action}ing improvement:`, err);
      alert(err instanceof Error ? err.message : `Failed to ${action} improvement`);
    } finally {
      setProcessingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(improvementId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
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
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Translation Reviews</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve AI-suggested translation improvements
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
          <div className="text-sm text-muted-foreground">Pending Review</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-sm text-muted-foreground">Rejected</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium">Status:</span>
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
      {!loading && !error && improvements.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/30">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No {statusFilter} translation improvements found
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-32">Article</TableHead>
                <TableHead className="w-24">Sentence</TableHead>
                <TableHead className="w-32">Arabic Word</TableHead>
                <TableHead className="w-40">Current English</TableHead>
                <TableHead className="w-40">New English</TableHead>
                <TableHead className="w-48">Current Grammar</TableHead>
                <TableHead className="w-56">New Grammar</TableHead>
                <TableHead className="w-48">Reviewer Notes</TableHead>
                {statusFilter === 'pending' && (
                  <TableHead className="w-32 text-center">Actions</TableHead>
                )}
                <TableHead className="w-32">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {improvements.map((improvement, index) => {
                const isProcessing = processingIds.has(improvement.id);
                const word = improvement.sentence_words;
                const sentence = word.article_sentences;
                const article = sentence?.articles;

                return (
                  <TableRow key={improvement.id} className={isProcessing ? 'opacity-50' : ''}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>

                    {/* Article */}
                    <TableCell>
                      {article ? (
                        <a
                          href={`/articles/${article.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm hover:underline text-blue-600 dark:text-blue-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="truncate max-w-[120px]">{article.title}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Sentence Position */}
                    <TableCell>
                      <div className="text-xs text-muted-foreground">
                        S{sentence?.position || '?'} / W{word.position}
                      </div>
                    </TableCell>

                    {/* Arabic Word */}
                    <TableCell>
                      <span className="text-lg font-medium" dir="rtl">
                        {word.word_form}
                      </span>
                    </TableCell>

                    {/* Current English */}
                    <TableCell>
                      <span className="text-sm">{word.english}</span>
                    </TableCell>

                    {/* New English (Editable) */}
                    <TableCell>
                      <Input
                        value={editedEnglish[improvement.id] || ''}
                        onChange={(e) =>
                          setEditedEnglish((prev) => ({
                            ...prev,
                            [improvement.id]: e.target.value,
                          }))
                        }
                        disabled={isProcessing || statusFilter !== 'pending'}
                        className="text-sm font-medium bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      />
                    </TableCell>

                    {/* Current Grammar Note */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground italic">
                        {word.grammar_note || '—'}
                      </span>
                    </TableCell>

                    {/* New Grammar Note (Editable) */}
                    <TableCell>
                      <Textarea
                        value={editedGrammarNote[improvement.id] || ''}
                        onChange={(e) =>
                          setEditedGrammarNote((prev) => ({
                            ...prev,
                            [improvement.id]: e.target.value || null,
                          }))
                        }
                        disabled={isProcessing || statusFilter !== 'pending'}
                        placeholder="Optional"
                        className="text-xs italic bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 min-h-[80px] resize-y"
                      />
                    </TableCell>

                    {/* Reviewer Notes */}
                    <TableCell>
                      {statusFilter === 'pending' ? (
                        <Textarea
                          value={reviewerNotes[improvement.id] || ''}
                          onChange={(e) =>
                            setReviewerNotes((prev) => ({
                              ...prev,
                              [improvement.id]: e.target.value,
                            }))
                          }
                          disabled={isProcessing}
                          placeholder="Optional notes..."
                          className="text-xs min-h-[60px]"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          {improvement.reviewer_notes || '—'}
                        </span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    {statusFilter === 'pending' && (
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAction(improvement.id, 'approve')}
                            disabled={isProcessing}
                            className="cursor-pointer bg-green-600 hover:bg-green-700"
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
                            className="cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    )}

                    {/* Date */}
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(improvement.created_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Context Preview */}
      {improvements.length > 0 && (
        <div className="text-sm text-muted-foreground">
          Showing {improvements.length} {statusFilter} improvement
          {improvements.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
