'use client';

import { useRef, useEffect } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const WORDS = [
  { arabic: 'كِتَاب', english: 'Book' },
  { arabic: 'عِلْم', english: 'Knowledge' },
  { arabic: 'قَلْب', english: 'Heart' },
  { arabic: 'نُور', english: 'Light' },
  { arabic: 'صَبْر', english: 'Patience' },
  { arabic: 'حِكْمَة', english: 'Wisdom' },
  { arabic: 'إِيمَان', english: 'Faith' },
  { arabic: 'شُكْر', english: 'Gratitude' },
  { arabic: 'رَحْمَة', english: 'Mercy' },
  { arabic: 'سَلَام', english: 'Peace' },
  { arabic: 'حَقّ', english: 'Truth' },
  { arabic: 'أَمَل', english: 'Hope' },
  { arabic: 'تَقْوَى', english: 'Piety' },
  { arabic: 'ذِكْر', english: 'Remembrance' },
  { arabic: 'دُعَاء', english: 'Supplication' },
  { arabic: 'تَوْبَة', english: 'Repentance' },
  { arabic: 'جَنَّة', english: 'Paradise' },
  { arabic: 'هِدَايَة', english: 'Guidance' },
  { arabic: 'بَرَكَة', english: 'Blessing' },
  { arabic: 'عَدْل', english: 'Justice' },
  { arabic: 'خَيْر', english: 'Goodness' },
  { arabic: 'رُوح', english: 'Soul' },
  { arabic: 'حُبّ', english: 'Love' },
  { arabic: 'جَمَال', english: 'Beauty' },
  { arabic: 'فَجْر', english: 'Dawn' },
  { arabic: 'عَقْل', english: 'Mind' },
  { arabic: 'صِدْق', english: 'Honesty' },
  { arabic: 'أَمَانَة', english: 'Trust' },
  { arabic: 'فَرَح', english: 'Joy' },
  { arabic: 'سَكِينَة', english: 'Tranquility' },
  { arabic: 'قُوَّة', english: 'Strength' },
  { arabic: 'حَيَاة', english: 'Life' },
  { arabic: 'سَمَاء', english: 'Sky' },
  { arabic: 'أَرْض', english: 'Earth' },
  { arabic: 'مَاء', english: 'Water' },
  { arabic: 'نَجْم', english: 'Star' },
  { arabic: 'قَمَر', english: 'Moon' },
  { arabic: 'شَمْس', english: 'Sun' },
  { arabic: 'وَقْت', english: 'Time' },
  { arabic: 'طَرِيق', english: 'Path' },
  { arabic: 'بَحْر', english: 'Sea' },
  { arabic: 'جَبَل', english: 'Mountain' },
  { arabic: 'نَهْر', english: 'River' },
  { arabic: 'زَهْر', english: 'Flower' },
  { arabic: 'شَجَر', english: 'Tree' },
  { arabic: 'رِيح', english: 'Wind' },
  { arabic: 'مَطَر', english: 'Rain' },
  { arabic: 'ثَلْج', english: 'Snow' },
  { arabic: 'نَار', english: 'Fire' },
  { arabic: 'ظِلّ', english: 'Shadow' },
  { arabic: 'صَوْت', english: 'Voice' },
  { arabic: 'لَوْن', english: 'Color' },
  { arabic: 'عَيْن', english: 'Eye' },
  { arabic: 'يَد', english: 'Hand' },
  { arabic: 'بَاب', english: 'Door' },
  { arabic: 'بَيْت', english: 'Home' },
  { arabic: 'ضَوْء', english: 'Light' },
  { arabic: 'لَيْل', english: 'Night' },
  { arabic: 'صُبْح', english: 'Morning' },
  { arabic: 'عُمْر', english: 'Age' },
];

// Depth layers: [x%, y%, size, opacity, depth, colorClass, blur]
// depth: 1 = closest (center), 0.1 = furthest (edges)
const POSITIONS: [number, number, string, number, number, string, string][] = [
  // Layer 0: Center - largest, brightest, primary color
  [50, 50, 'text-5xl', 1, 1, 'text-primary', ''],

  // Layer 1: Inner ring - large, strong color
  [50, 32, 'text-3xl', 0.9, 0.95, 'text-primary/90', ''],
  [65, 41, 'text-3xl', 0.9, 0.95, 'text-primary/90', ''],
  [65, 59, 'text-3xl', 0.9, 0.95, 'text-primary/90', ''],
  [50, 68, 'text-3xl', 0.9, 0.95, 'text-primary/90', ''],
  [35, 59, 'text-3xl', 0.9, 0.95, 'text-primary/90', ''],
  [35, 41, 'text-3xl', 0.9, 0.95, 'text-primary/90', ''],

  // Layer 2: Second ring - medium-large, slightly muted
  [50, 18, 'text-2xl', 0.75, 0.8, 'text-primary/70', ''],
  [71, 27, 'text-2xl', 0.75, 0.8, 'text-primary/70', ''],
  [82, 50, 'text-2xl', 0.75, 0.8, 'text-primary/70', ''],
  [71, 73, 'text-2xl', 0.75, 0.8, 'text-primary/70', ''],
  [50, 82, 'text-2xl', 0.75, 0.8, 'text-primary/70', ''],
  [29, 73, 'text-2xl', 0.75, 0.8, 'text-primary/70', ''],
  [18, 50, 'text-2xl', 0.75, 0.8, 'text-primary/70', ''],
  [29, 27, 'text-2xl', 0.75, 0.8, 'text-primary/70', ''],

  // Layer 3: Third ring - medium, transitioning to muted
  [50, 6, 'text-xl', 0.55, 0.55, 'text-muted-foreground/70', ''],
  [77, 15, 'text-xl', 0.55, 0.55, 'text-muted-foreground/70', ''],
  [93, 38, 'text-xl', 0.55, 0.55, 'text-muted-foreground/70', ''],
  [93, 62, 'text-xl', 0.55, 0.55, 'text-muted-foreground/70', ''],
  [77, 85, 'text-xl', 0.55, 0.55, 'text-muted-foreground/70', ''],
  [50, 94, 'text-xl', 0.55, 0.55, 'text-muted-foreground/70', ''],
  [23, 85, 'text-xl', 0.55, 0.55, 'text-muted-foreground/70', ''],
  [7, 62, 'text-xl', 0.55, 0.55, 'text-muted-foreground/70', ''],
  [7, 38, 'text-xl', 0.55, 0.55, 'text-muted-foreground/70', ''],
  [23, 15, 'text-xl', 0.55, 0.55, 'text-muted-foreground/70', ''],

  // Layer 4: Outer ring - small, muted colors
  [61, 3, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [84, 10, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [97, 30, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [97, 70, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [84, 90, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [61, 97, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [39, 97, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [16, 90, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [3, 70, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [3, 30, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [16, 10, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],
  [39, 3, 'text-base', 0.4, 0.35, 'text-muted-foreground/50', 'blur-[0.3px]'],

  // Layer 5: Far background - tiny, very muted, blurred
  [72, 22, 'text-sm', 0.25, 0.2, 'text-muted-foreground/30', 'blur-[0.5px]'],
  [88, 50, 'text-sm', 0.25, 0.2, 'text-muted-foreground/30', 'blur-[0.5px]'],
  [72, 78, 'text-sm', 0.25, 0.2, 'text-muted-foreground/30', 'blur-[0.5px]'],
  [28, 78, 'text-sm', 0.25, 0.2, 'text-muted-foreground/30', 'blur-[0.5px]'],
  [12, 50, 'text-sm', 0.25, 0.2, 'text-muted-foreground/30', 'blur-[0.5px]'],
  [28, 22, 'text-sm', 0.25, 0.2, 'text-muted-foreground/30', 'blur-[0.5px]'],
  [50, 12, 'text-sm', 0.25, 0.2, 'text-muted-foreground/30', 'blur-[0.5px]'],
  [50, 88, 'text-sm', 0.25, 0.2, 'text-muted-foreground/30', 'blur-[0.5px]'],

  // Layer 6: Furthest - smallest, barely visible, most blur
  [85, 5, 'text-xs', 0.15, 0.1, 'text-muted-foreground/20', 'blur-[0.7px]'],
  [95, 50, 'text-xs', 0.15, 0.1, 'text-muted-foreground/20', 'blur-[0.7px]'],
  [85, 95, 'text-xs', 0.15, 0.1, 'text-muted-foreground/20', 'blur-[0.7px]'],
  [15, 95, 'text-xs', 0.15, 0.1, 'text-muted-foreground/20', 'blur-[0.7px]'],
  [5, 50, 'text-xs', 0.15, 0.1, 'text-muted-foreground/20', 'blur-[0.7px]'],
  [15, 5, 'text-xs', 0.15, 0.1, 'text-muted-foreground/20', 'blur-[0.7px]'],
];

export function ArabicWordCloud() {
  const containerRef = useRef<HTMLDivElement>(null);
  const wordsRef = useRef<HTMLSpanElement[]>([]);
  const rafId = useRef<number>(0);

  // Native event listeners for better performance - no React synthetic event overhead
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check reduced motion preference once
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    let lastX = 0;
    let lastY = 0;

    const updatePositions = () => {
      const words = wordsRef.current;
      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const pos = POSITIONS[i];
        if (!word || !pos) continue;
        const strength = 4 + (1 - pos[4]) * 20;
        word.style.transform = `translate(${lastX * strength}px, ${lastY * strength}px)`;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      lastX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      lastY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(updatePositions);
    };

    const onMouseLeave = () => {
      cancelAnimationFrame(rafId.current);
      lastX = 0;
      lastY = 0;
      const words = wordsRef.current;
      for (let i = 0; i < words.length; i++) {
        if (words[i]) words[i].style.transform = '';
      }
    };

    container.addEventListener('mousemove', onMouseMove, { passive: true });
    container.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cancelAnimationFrame(rafId.current);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  return (
    <TooltipProvider delayDuration={0}>
      <div
        ref={containerRef}
        className="group/cloud relative h-80 w-full select-none overflow-hidden rounded-xl"
        role="img"
        aria-label="Arabic vocabulary cloud with translations on hover"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, oklch(from var(--color-primary) l c h / 0.08) 0%, transparent 60%)',
        }}
      >
        {WORDS.map((word, i) => {
          const pos = POSITIONS[i];
          if (!pos) return null;
          const [x, y, size, opacity, , color, blur] = pos;

          return (
            <Tooltip key={word.arabic}>
              <TooltipTrigger asChild>
                <span
                  ref={(el) => { if (el) wordsRef.current[i] = el; }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer font-arabic transition-[color,opacity,transform] duration-150 ease-out
                    ${size} ${color} ${blur}
                    group-hover/cloud:opacity-10 hover:!opacity-100 hover:!text-primary hover:scale-110 hover:z-10 hover:blur-none`}
                  style={{ top: `${y}%`, left: `${x}%`, opacity }}
                  lang="ar"
                  dir="rtl"
                >
                  {word.arabic}
                </span>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="border-0 bg-foreground text-background px-3 py-1.5 text-sm font-medium shadow-md"
              >
                {word.english}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
