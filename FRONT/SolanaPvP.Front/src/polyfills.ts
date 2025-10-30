// Polyfills for Node.js modules in browser environment
import { Buffer } from "buffer";

// Make Buffer available globally
if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

// Polyfill for crypto module
if (typeof window !== "undefined" && !window.crypto) {
  // Use Web Crypto API as fallback
  (window as any).crypto = window.crypto || {
    getRandomValues: (arr: any) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  };
}

// Polyfill for stream module (minimal implementation)
if (typeof window !== "undefined" && !(window as any).stream) {
  (window as any).stream = {
    Readable: class Readable {
      constructor() {}
    },
    Writable: class Writable {
      constructor() {}
    },
    Transform: class Transform {
      constructor() {}
    },
  };
}
