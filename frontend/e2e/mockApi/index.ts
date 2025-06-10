import { mockFetch, originalFetch } from './mockFetch';

// Environment flag to enable/disable mocking
let mockingEnabled = false;

// Function to enable API mocking
export function enableApiMocking(): void {
	if (mockingEnabled) return;

	console.log('🎭 Enabling API mocking with gRPC-compatible responses');

	// Replace global fetch with our mock
	global.fetch = mockFetch;
	mockingEnabled = true;

	// Set global flag for debug wallet
	(global as any).__E2E_MOCKING_ENABLED__ = true;
}

// Function to disable API mocking
export function disableApiMocking(): void {
	if (!mockingEnabled) return;

	console.log('🎭 Disabling API mocking');

	// Restore original fetch
	global.fetch = originalFetch;
	mockingEnabled = false;

	// Clear global flag
	(global as any).__E2E_MOCKING_ENABLED__ = false;
}
