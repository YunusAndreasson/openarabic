// Mobile-only Jest polyfills for React Native
// Removed web-specific polyfills since this is mobile-only

// Text encoding polyfills for Node.js compatibility
import { TextDecoder, TextEncoder } from 'util';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

// Performance API polyfill for timing measurements
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    mark: () => {},
    measure: () => {},
    clearMarks: () => {},
    clearMeasures: () => {},
  };
}

// AbortController polyfill for cancellable requests
if (typeof global.AbortController === 'undefined') {
  global.AbortController = class AbortController {
    constructor() {
      this.signal = {
        aborted: false,
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    }

    abort() {
      this.signal.aborted = true;
    }
  };
}
