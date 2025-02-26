import { useState, useEffect } from 'react';

/**
 * Hook for animating progress values with cubic easing
 * @param targetProgress - The target progress value to animate to
 * @param duration - Animation duration in milliseconds
 * @param isReady - Whether the component is ready to start animation
 * @returns Current animated progress value
 */
export function useProgressAnimation(targetProgress: number, duration = 1000, isReady = true) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Run animation when progress changes
  useEffect(() => {
    if (!isReady) return;

    let startTimestamp: number | null = null;
    let animationFrameId: number;
    const startValue = animatedProgress;
    const endValue = targetProgress;

    // Animation function using requestAnimationFrame
    const animate = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;

      // Calculate progress (0 to 1)
      const animationProgress = Math.min(elapsed / duration, 1);

      // Apply easing function (cubic out)
      const easedProgress = 1 - Math.pow(1 - animationProgress, 3);

      // Calculate current value
      const currentValue = startValue + (endValue - startValue) * easedProgress;

      // Update state
      setAnimatedProgress(currentValue);

      // Continue animation if not finished
      if (animationProgress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    // Start animation
    animationFrameId = requestAnimationFrame(animate);

    // Cleanup
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [targetProgress, isReady, duration, animatedProgress]);

  return animatedProgress;
}
