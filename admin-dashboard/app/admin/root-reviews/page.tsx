'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Loader2, X, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

interface Root {
  id: number;
  letters: string;
  meaning: string;
}

interface RootImprovement {
  id: number;
  root_id: number;
  suggested_english: string;
  suggested_tashkeel: string | null;
  status: string;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  roots: Root | null;
}

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
}

export default function RootReviewsPage() {
  const [improvements, setImprovements] = useState<RootImprovement[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  // Track which items are selected for bulk reject
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    fetchImprovements();
    fetchStats();
  }, [statusFilter]);

  const fetchImprovements = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/root-improvements?status=${statusFilter}`);
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch improvements');
      }

      setImprovements(result.data || []);
      // Clear selections when switching views
      setSelectedIds(new Set());
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
        fetch('/api/root-improvements?status=pending'),
        fetch('/api/root-improvements?status=approved'),
        fetch('/api/root-improvements?status=rejected'),
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

  const handleSingleAction = async (improvementId: number, action: 'approve' | 'reject') => {
    setProcessingAction(`single-${improvementId}`);

    try {
      const response = await fetch('/api/root-improvements', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: improvementId,
          action,
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
    } catch (err) {
      console.error(`Error ${action}ing improvement:`, err);
      alert(err instanceof Error ? err.message : `Failed to ${action} improvement`);
    } finally {
      setProcessingAction(null);
    }
  };

  const handleBulkReject = async () => {
    if (selectedIds.size === 0) {
      alert('No items selected for rejection');
      return;
    }

    if (!confirm(`Are you sure you want to reject ${selectedIds.size} items?`)) {
      return;
    }

    setProcessingAction('bulk-reject');

    try {
      const response = await fetch('/api/root-improvements', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'bulk-reject',
          ids: Array.from(selectedIds),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to bulk reject improvements');
      }

      // Remove rejected items from current list
      setImprovements(prev => prev.filter(imp => !selectedIds.has(imp.id)));
      setSelectedIds(new Set());

      // Update stats
      fetchStats();
    } catch (err) {
      console.error('Error bulk rejecting:', err);
      alert(err instanceof Error ? err.message : 'Failed to bulk reject improvements');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleApplyAll = async () => {
    const remainingCount = improvements.length - selectedIds.size;

    if (remainingCount === 0) {
      alert('All items are selected for rejection. Nothing to apply.');
      return;
    }

    if (
      !confirm(
        `This will apply ${remainingCount} root improvements to the database (excluding ${selectedIds.size} selected for rejection). This cannot be undone. Continue?`,
      )
    ) {
      return;
    }

    setProcessingAction('apply-all');

    try {
      // First, bulk reject selected items
      if (selectedIds.size > 0) {
        const rejectResponse = await fetch('/api/root-improvements', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'bulk-reject',
            ids: Array.from(selectedIds),
          }),
        });

        const rejectResult = await rejectResponse.json();
        if (!rejectResult.success) {
          throw new Error('Failed to reject selected items');
        }
      }

      // Then apply all remaining pending items
      const response = await fetch('/api/root-improvements', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'apply-all-pending',
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to apply improvements');
      }

      alert(`Successfully applied ${result.count} root improvements!`);

      // Clear list and refresh
      setImprovements([]);
      setSelectedIds(new Set());
      fetchStats();
    } catch (err) {
      console.error('Error applying improvements:', err);
      alert(err instanceof Error ? err.message : 'Failed to apply improvements');
    } finally {
      setProcessingAction(null);
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === improvements.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(improvements.map(imp => imp.id)));
    }
  };

  if (loading && improvements.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading root reviews...</span>
      </div>
    );
  }

  const isProcessing = processingAction !== null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Root Translation Reviews</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve AI-suggested root translation improvements
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

      {/* Filter and Actions */}
      <div className="flex items-center justify-between gap-4">
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

        {statusFilter === 'pending' && improvements.length > 0 && (
          <div className="flex gap-2">
            {selectedIds.size > 0 && (
              <Button
                variant="destructive"
                onClick={handleBulkReject}
                disabled={isProcessing}
                className="cursor-pointer"
              >
                {processingAction === 'bulk-reject' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Reject {selectedIds.size} Selected
                  </>
                )}
              </Button>
            )}
            <Button
              onClick={handleApplyAll}
              disabled={isProcessing}
              className="cursor-pointer bg-green-600 hover:bg-green-700"
            >
              {processingAction === 'apply-all' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Apply All Remaining ({improvements.length - selectedIds.size})
                </>
              )}
            </Button>
          </div>
        )}
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
                {statusFilter === 'pending' && (
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === improvements.length && improvements.length > 0}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </TableHead>
                )}
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-48">Current Arabic</TableHead>
                <TableHead className="w-48">Suggested Arabic</TableHead>
                <TableHead className="w-48">Current English</TableHead>
                <TableHead className="w-48">Suggested English</TableHead>
                <TableHead>Issue/Reasoning</TableHead>
                {statusFilter === 'pending' && <TableHead className="w-24">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {improvements.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={statusFilter === 'pending' ? 8 : 7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No {statusFilter} improvements found
                  </TableCell>
                </TableRow>
              ) : (
                improvements.map((improvement, index) => {
                  const isSelected = selectedIds.has(improvement.id);
                  const isRowProcessing = processingAction === `single-${improvement.id}`;
                  const root = improvement.roots;

                  return (
                    <TableRow
                      key={improvement.id}
                      className={`${isRowProcessing ? 'opacity-50' : ''} ${isSelected ? 'bg-red-50' : ''}`}
                    >
                      {statusFilter === 'pending' && (
                        <TableCell className="align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelection(improvement.id)}
                            disabled={isProcessing}
                            className="cursor-pointer"
                          />
                        </TableCell>
                      )}
                      <TableCell className="text-muted-foreground align-top">{index + 1}</TableCell>

                      {/* Current Arabic */}
                      <TableCell className="align-top">
                        <div className="text-2xl font-bold" dir="rtl">
                          {root?.letters || '—'}
                        </div>
                      </TableCell>

                      {/* Suggested Arabic */}
                      <TableCell className="align-top">
                        {improvement.suggested_tashkeel ? (
                          <div className="text-2xl font-bold text-green-700" dir="rtl">
                            {improvement.suggested_tashkeel}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No change</span>
                        )}
                      </TableCell>

                      {/* Current English */}
                      <TableCell className="align-top">
                        <div className="text-sm">{root?.meaning || '—'}</div>
                      </TableCell>

                      {/* Suggested English */}
                      <TableCell className="align-top">
                        <div className="text-sm font-medium text-green-700">
                          {improvement.suggested_english}
                        </div>
                      </TableCell>

                      {/* Reasoning */}
                      <TableCell className="align-top">
                        <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                          {improvement.reviewer_notes || 'No notes'}
                        </div>
                      </TableCell>

                      {/* Actions */}
                      {statusFilter === 'pending' && (
                        <TableCell className="align-top">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSingleAction(improvement.id, 'reject')}
                            disabled={isProcessing}
                            className="cursor-pointer p-2 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            {isRowProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <X className="h-4 w-4" />
                            )}
                          </Button>
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
