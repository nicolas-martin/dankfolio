// frontend/src/__mocks__/env.ts
// Mock environment variables for Jest tests

export const REACT_APP_API_URL = 'http://mock-api.url-from-env-mock-file'; // Directly export a string
export const DEBUG_MODE = 'true'; // Or 'false', or make it configurable if tests need to vary it
export const APP_ENV = 'test'; // Provide a default APP_ENV for tests