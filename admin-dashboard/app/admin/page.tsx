'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useGlobalTranslationCache } from '@/hooks/useGlobalTranslationCache';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Trash2, Database, Clock, TrendingUp, FileText, BookOpen } from 'lucide-react';

export default function AdminPage() {
  const { isLoading, stats, refresh, clear, error } = useGlobalTranslationCache();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      // Error already handled in hook
    } finally {
      setRefreshing(false);
    }
  };

  const handleClear = () => {
    if (
      confirm(
        'Are you sure you want to clear the translation cache? You will need to refresh to rebuild it.',
      )
    ) {
      clear();
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  };

  if (isLoading && !stats.totalWords) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading cache...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Manage translation cache and view system statistics
        </p>
      </div>

      {/* Quick Links */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/translation-reviews">
            <div className="p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">Word Translation Reviews</h3>
                  <p className="text-sm text-muted-foreground">Review sentence word improvements</p>
                </div>
              </div>
            </div>
          </Link>

          <Link href="/admin/root-reviews">
            <div className="p-4 border rounded-lg bg-background hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">Root Translation Reviews</h3>
                  <p className="text-sm text-muted-foreground">Review and apply root improvements</p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Cache Statistics */}
      <div className="border rounded-lg p-6 bg-card">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Translation Cache Statistics</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Words</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalWords.toLocaleString()}</p>
          </div>

          <div className="p-4 border rounded-lg bg-background">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Unique Arabic Words</span>
            </div>
            <p className="text-2xl font-bold">{stats.uniqueWords.toLocaleString()}</p>
          </div>

          <div className="p-4 border rounded-lg bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Translations</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalTranslations.toLocaleString()}</p>
          </div>

          <div className="p-4 border rounded-lg bg-background">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Last Updated</span>
            </div>
            <p className="text-sm font-medium">{formatDate(stats.lastUpdated)}</p>
          </div>

          <div className="p-4 border rounded-lg bg-background">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Translations/Word</span>
            </div>
            <p className="text-2xl font-bold">{stats.avgTranslationsPerWord}</p>
          </div>
        </div>
      </div>

      {/* Cache Management */}
      <div className="border rounded-lg p-6 bg-card">
        <h2 className="text-xl font-semibold mb-4">Cache Management</h2>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium mb-2">Refresh Cache</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Fetch the latest translation data from the database. Use this after making changes to
              word translations.
            </p>
            <Button onClick={handleRefresh} disabled={refreshing} className="cursor-pointer">
              {refreshing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Cache
                </>
              )}
            </Button>
          </div>

          <div className="p-4 border border-destructive/50 rounded-lg bg-destructive/5">
            <h3 className="font-medium mb-2 text-destructive">Clear Cache</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Remove all cached translation data from localStorage. You&apos;ll need to refresh the cache
              to rebuild it.
            </p>
            <Button onClick={handleClear} variant="destructive" className="cursor-pointer">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Cache
            </Button>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="border rounded-lg p-6 bg-muted/30">
        <h2 className="text-lg font-semibold mb-3">How It Works</h2>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>
              The translation cache stores all word translations locally for fast access across all
              articles
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Data is fetched fresh each session and held in memory</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Use Refresh to pull the latest data after updating word translations</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-0.5">•</span>
            <span>Alternative translations are detected automatically based on cached data</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
