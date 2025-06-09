// frontend/e2e/setup.ts
import { server } from './mocks/server';

// Establish API mocking before all tests.
beforeAll(() => server.listen({
  onUnhandledRequest: 'warn', // Warn about any requests that don't have a matching handler
}));

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests.
afterEach(() => server.resetHandlers());

// Clean up after the tests are finished.
afterAll(() => server.close());
