'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ArabicWordProps {
  wordForm: string;
  english: string;
  grammarNote?: string | null;
}

export function ArabicWord({ wordForm, english, grammarNote }: ArabicWordProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className="cursor-pointer transition-colors hover:bg-primary/10 rounded-sm px-0.5 inline-block"
            style={{
              fontFamily: 'Madina, "Noto Naskh Arabic", "Traditional Arabic", serif',
              fontFeatureSettings: '"calt" 1, "liga" 1, "kern" 1',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              fontWeight: 500,
            }}
          >
            {wordForm}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[250px] bg-popover text-popover-foreground border border-border shadow-lg"
        >
          <div className="space-y-1 text-left" dir="ltr">
            <p className="font-medium text-sm">{english}</p>
            {grammarNote && (
              <p className="text-xs text-muted-foreground italic">{grammarNote}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
