// Polyfills for React Native to work with Solana web3.js
import 'react-native-get-random-values';
import { Buffer } from 'buffer';

// Add global Buffer for React Native
global.Buffer = Buffer;

// Add process for React Native
if (typeof global.process === 'undefined') {
  global.process = { env: {} };
}

// Polyfill localStorage for secureStorage if needed
if (typeof global.localStorage === 'undefined') {
  const localStorage = {
    _data: {},
    getItem(key) {
      return this._data[key] || null;
    },
    setItem(key, value) {
      this._data[key] = value;
    },
    removeItem(key) {
      delete this._data[key];
    },
  };
  
  global.localStorage = localStorage;
} 