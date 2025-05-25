// Jest setup file for polyfills and globals

// Add Buffer polyfill for Node.js compatibility
global.Buffer = require('buffer').Buffer;

// Add base64url support if needed
if (!Buffer.prototype.toString.toString().includes('base64url')) {
  const originalToString = Buffer.prototype.toString;
  Buffer.prototype.toString = function(encoding, start, end) {
    if (encoding === 'base64url') {
      return originalToString.call(this, 'base64', start, end)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
    return originalToString.call(this, encoding, start, end);
  };
} 