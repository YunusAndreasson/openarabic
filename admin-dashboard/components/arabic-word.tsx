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
  disableTooltip?: boolean;
}

export function ArabicWord({ wordForm, english, grammarNote, disableTooltip = false }: ArabicWordProps) {
  const wordSpan = (
    <span
      className={disableTooltip ? "inline-block" : "cursor-pointer transition-colors duration-150 hover:bg-primary/10 rounded-md px-0.5 inline-block"}
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
  );

  if (disableTooltip) {
    return wordSpan;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          {wordSpan}
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[250px] bg-popover text-popover-foreground border border-border shadow-lg"
        >
          <div className="space-y-1.5 text-left" dir="ltr">
            <p className="font-semibold text-base leading-tight">{english}</p>
            {grammarNote && (
              <p className="text-sm text-muted-foreground italic leading-snug">{grammarNote}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
