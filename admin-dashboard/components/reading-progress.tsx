'use client';

import { useEffect, useState, useRef } from 'react';

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);
  const docHeightCache = useRef(0);

  useEffect(() => {
    // Cache document height to avoid repeated reflows
    const cacheDocHeight = () => {
      docHeightCache.current = document.documentElement.scrollHeight - window.innerHeight;
    };

    // Batch scroll updates with requestAnimationFrame to prevent forced reflows
    const updateProgress = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(() => {
          const scrollTop = window.scrollY;
          const scrollPercent = (scrollTop / docHeightCache.current) * 100;
          setProgress(Math.min(scrollPercent, 100));
          ticking.current = false;
        });
        ticking.current = true;
      }
    };

    cacheDocHeight();
    updateProgress();

    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', cacheDocHeight, { passive: true });

    return () => {
      window.removeEventListener('scroll', updateProgress);
      window.removeEventListener('resize', cacheDocHeight);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2px] bg-primary/20 z-40"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Reading progress"
    >
      <div
        className="h-full bg-primary transition-all duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
