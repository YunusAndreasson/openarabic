'use client';

import { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ArabicWordProps {
  wordForm: string;
  english: string;
  grammarNote?: string | null;
}

export function ArabicWord({ wordForm, english, grammarNote }: ArabicWordProps) {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    setOpen(!open);
  };

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <span
          onClick={handleClick}
          className={`arabic-word cursor-pointer inline-block touch-manipulation rounded-md px-0.5 ${
            open ? 'arabic-word-active' : ''
          }`}
          style={{
            fontFamily: 'var(--font-madina), "Noto Naskh Arabic", "Traditional Arabic", serif',
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
        onPointerDownOutside={() => setOpen(false)}
      >
        <div className="space-y-1.5 text-left" dir="ltr">
          <p className="font-semibold text-base leading-tight">{english}</p>
          {grammarNote && (
            <p className="text-sm text-muted-foreground italic leading-snug">{grammarNote}</p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
