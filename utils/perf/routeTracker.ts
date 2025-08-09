let currentRouteName: string | null = null;
let stackDepth: number | null = null;

export function registerNavigationContainer(
  // Use 'any' here deliberately; this is a dev helper and we want to support both expo-router and react-navigation refs
  ref: any
): void {
  try {
    const onStateChange = (): void => {
      try {
        const route = ref.getCurrentRoute?.();
        currentRouteName = route?.name ?? null;
        // Best-effort depth from state tree
        const state = ref.getRootState?.();
        // Derive a simple depth metric
        const computeDepth = (s: any | undefined): number => {
          if (!s) return 0;
          if (!s.routes || s.index == null) return 0;
          const child = s.routes[s.index]?.state;
          return 1 + computeDepth(child);
        };
        stackDepth = computeDepth(state);
      } catch {
        // ignore
      }
    };
    // Initial
    onStateChange();
    // Subscribe
    ref.addListener?.('state', onStateChange);
  } catch {
    // ignore errors in dev helper
  }
}

export function getCurrentRouteInfo(): { name: string | null; stackDepth: number | null } {
  return { name: currentRouteName, stackDepth };
}
