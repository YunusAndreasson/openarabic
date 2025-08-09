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
