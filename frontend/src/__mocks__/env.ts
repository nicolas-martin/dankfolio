// frontend/src/__mocks__/env.ts
// Mock environment variables for Jest tests

if (!process.env.REACT_APP_API_URL) {
  process.env.REACT_APP_API_URL = 'http://mock-api.test-from-mock-file';
}

export const REACT_APP_API_URL = process.env.REACT_APP_API_URL;