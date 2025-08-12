// Dev-only bootstrap for performance logging
// This file is imported in app/_layout.tsx
if (__DEV__) {
  // Use dynamic import to satisfy lint rule against require()

  import('../utils/perf/enableRerenderLogging').then(mod => {
    try {
      mod.enable();
    } catch {
      // ignore
    }
  });
}

// Expo Router scans files in the app/ directory as routes. Provide a no-op default export
// so this dev-only bootstrap file does not trigger a missing default export warning.
export default function DevBootstrap(): null {
  return null;
}
