import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowRight, Check, AlertCircle, Sparkles } from 'lucide-react';

interface SummaryPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalSummary: string;
  optimizedSummary: string | null;
  originalWordCount: number;
  optimizedWordCount: number;
  isOptimizing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onOptimizedSummaryChange: (value: string) => void;
  onStartOptimization: () => void;
}

function getWordCountColor(wordCount: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (wordCount < 20) {
    return { bg: 'bg-yellow-500', text: 'text-yellow-700', label: 'Short' };
  } else if (wordCount <= 30) {
    return { bg: 'bg-green-500', text: 'text-green-700', label: 'Good' };
  } else {
    return { bg: 'bg-orange-500', text: 'text-orange-700', label: 'Long' };
  }
}

export function SummaryPreviewDialog({
  open,
  onOpenChange,
  originalSummary,
  optimizedSummary,
  originalWordCount,
  optimizedWordCount,
  isOptimizing,
  onSave,
  onCancel,
  onOptimizedSummaryChange,
  onStartOptimization,
}: SummaryPreviewDialogProps) {
  const originalStatus = getWordCountColor(originalWordCount);
  const optimizedStatus = optimizedSummary ? getWordCountColor(optimizedWordCount) : null;

  const hasImproved =
    optimizedSummary &&
    ((originalWordCount < 20 && optimizedWordCount >= 20) ||
      (originalWordCount > 30 && optimizedWordCount <= 30) ||
      (originalWordCount >= 20 &&
        originalWordCount <= 30 &&
        optimizedWordCount >= 20 &&
        optimizedWordCount <= 30));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Summary Optimization</DialogTitle>
          <DialogDescription>Review the AI-generated summary before saving</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Before/After Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original Summary */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Original Summary</h3>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${originalStatus.bg}`} />
                  <span className={`text-xs font-medium ${originalStatus.text}`}>
                    {originalWordCount}w
                  </span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed min-h-[180px]">
                {originalSummary}
              </p>
            </div>

            {/* Arrow */}
            <div className="hidden md:flex items-center justify-center absolute left-1/2 -translate-x-1/2 top-32">
              <div className="bg-background border rounded-full p-2">
                <ArrowRight className="h-4 w-4 text-primary" />
              </div>
            </div>

            {/* Optimized Summary */}
            <div className="border rounded-lg p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">AI-Optimized Summary</h3>
                {optimizedStatus && (
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${optimizedStatus.bg}`} />
                    <span className={`text-xs font-medium ${optimizedStatus.text}`}>
                      {optimizedWordCount}w
                    </span>
                  </div>
                )}
              </div>
              {isOptimizing ? (
                <div className="flex flex-col items-center justify-center min-h-[180px] gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Optimizing summary...</span>
                </div>
              ) : optimizedSummary ? (
                <Textarea
                  value={optimizedSummary}
                  onChange={e => onOptimizedSummaryChange(e.target.value)}
                  className="text-sm leading-relaxed min-h-[180px] resize-y cursor-text"
                  placeholder="AI-optimized summary"
                />
              ) : (
                <div className="flex flex-col items-center justify-center min-h-[180px] gap-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Click the button below to generate an AI-optimized summary
                  </p>
                  <Button onClick={onStartOptimization} size="sm" className="cursor-pointer">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate AI Summary
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Improvement Indicator */}
          {optimizedSummary && (
            <div
              className={`border rounded-lg p-4 ${
                hasImproved
                  ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                  : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {hasImproved ? (
                  <Check className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                )}
                <div>
                  <p className="text-sm font-medium mb-1">
                    {hasImproved ? 'Summary Improved!' : 'Summary Changed'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {originalWordCount < 20 && optimizedWordCount >= 20 && (
                      <>
                        Expanded from {originalWordCount} to {optimizedWordCount} words
                      </>
                    )}
                    {originalWordCount > 30 && optimizedWordCount <= 30 && (
                      <>
                        Condensed from {originalWordCount} to {optimizedWordCount} words
                      </>
                    )}
                    {originalWordCount >= 20 && originalWordCount <= 30 && (
                      <>
                        Refined from {originalWordCount} to {optimizedWordCount} words
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Word Count Change */}
          {optimizedSummary && (
            <div className="text-center text-sm text-muted-foreground">
              Word count: {originalWordCount} → {optimizedWordCount} (
              {optimizedWordCount > originalWordCount ? '+' : ''}
              {optimizedWordCount - originalWordCount} words)
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isOptimizing}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isOptimizing || !optimizedSummary}
            className="min-w-24 cursor-pointer"
          >
            {isOptimizing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Optimizing...
              </>
            ) : (
              'Save Summary'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
