// Jest polyfills for consistent cross-platform testing
// Optimized for AI coding agents

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

// URL polyfill for React Native environment
if (typeof global.URL === 'undefined') {
  global.URL = class URL {
    constructor(url) {
      this.href = url;
      this.origin = url.split('/').slice(0, 3).join('/');
      this.pathname = url.split('/').slice(3).join('/') || '/';
    }
  };
}

// Blob polyfill for file handling tests
if (typeof global.Blob === 'undefined') {
  global.Blob = class Blob {
    constructor(parts = [], options = {}) {
      this.parts = parts;
      this.type = options.type || '';
      this.size = parts.reduce((size, part) => size + (part.length || 0), 0);
    }
  };
}

// FormData polyfill for API tests
if (typeof global.FormData === 'undefined') {
  global.FormData = class FormData {
    constructor() {
      this.data = new Map();
    }

    append(key, value) {
      this.data.set(key, value);
    }

    get(key) {
      return this.data.get(key);
    }

    has(key) {
      return this.data.has(key);
    }
  };
}

// Headers polyfill for fetch API tests
if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init = {}) {
      this.headers = new Map();
      if (init) {
        Object.entries(init).forEach(([key, value]) => {
          this.headers.set(key.toLowerCase(), value);
        });
      }
    }

    get(name) {
      return this.headers.get(name.toLowerCase());
    }

    set(name, value) {
      this.headers.set(name.toLowerCase(), value);
    }

    has(name) {
      return this.headers.has(name.toLowerCase());
    }
  };
}

// Request/Response polyfills for fetch tests
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = input;
      this.method = init.method || 'GET';
      this.headers = new global.Headers(init.headers);
      this.body = init.body;
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new global.Headers(init.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }

    async json() {
      return JSON.parse(this.body || '{}');
    }

    async text() {
      return this.body || '';
    }
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

// Note: ResizeObserver, IntersectionObserver, and MutationObserver
// are web-specific APIs not needed for mobile-only React Native apps

// Console polyfills for consistent logging
if (typeof global.console === 'undefined') {
  global.console = {
    log: () => {},
    error: () => {},
    warn: () => {},
    info: () => {},
    debug: () => {},
    trace: () => {},
    group: () => {},
    groupEnd: () => {},
    time: () => {},
    timeEnd: () => {},
  };
}
