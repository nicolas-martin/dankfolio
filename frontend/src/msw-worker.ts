// src/msw-worker.ts
import { setupWorker } from 'msw/browser';
import { handlers } from '../../e2e/mocks/handlers'; // Adjust path as necessary

export const worker = setupWorker(...handlers);
