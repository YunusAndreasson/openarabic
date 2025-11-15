'use client';

import { useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ComponentProps } from 'react';

type PrefetchLinkProps = ComponentProps<typeof Link> & {
  /**
   * When to prefetch the link
   * - 'hover': Prefetch on mouse enter (default, best for immediate UX)
   * - 'viewport': Prefetch when link enters viewport (best for anticipatory loading)
   * - 'mount': Prefetch on component mount (Next.js default behavior)
   * - 'never': Disable prefetching
   */
  prefetchOn?: 'hover' | 'viewport' | 'mount' | 'never';
};

/**
 * Link component with configurable prefetch behavior
 *
 * @example
 * ```tsx
 * // Prefetch on hover (best for cards, buttons)
 * <PrefetchLink href="/article/123" prefetchOn="hover">Read Article</PrefetchLink>
 *
 * // Prefetch on viewport (best for lists of links)
 * <PrefetchLink href="/article/123" prefetchOn="viewport">Read Article</PrefetchLink>
 *
 * // Disable prefetch (best for external links, logout)
 * <PrefetchLink href="/logout" prefetchOn="never">Logout</PrefetchLink>
 * ```
 */
export function PrefetchLink({
  prefetchOn = 'hover',
  href,
  onMouseEnter,
  children,
  ...props
}: PrefetchLinkProps) {
  const router = useRouter();

  const handlePrefetch = useCallback(() => {
    if (typeof href === 'string') {
      router.prefetch(href);
    }
  }, [router, href]);

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (prefetchOn === 'hover') {
        handlePrefetch();
      }
      onMouseEnter?.(e);
    },
    [prefetchOn, handlePrefetch, onMouseEnter],
  );

  // For 'mount' behavior, use Next.js default prefetch
  // For 'never', disable Next.js prefetch
  const nextPrefetch = prefetchOn === 'mount' ? undefined : false;

  // TODO: Implement viewport-based prefetching with IntersectionObserver
  // This would go in a useEffect hook that observes the link element

  return (
    <Link
      href={href}
      prefetch={nextPrefetch}
      onMouseEnter={handleMouseEnter}
      {...props}
    >
      {children}
    </Link>
  );
}
