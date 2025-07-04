import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';

export type PollingStatus = 'idle' | 'pending' | 'polling' | 'confirmed' | 'finalized' | 'failed';

interface PollingResponse {
	finalized?: boolean;
	error?: string | object;
	confirmations?: number;
	status?: string;
}

export interface TransactionPollingResult<T> {
	status: PollingStatus;
	data: T | null;
	error: string | null;
	confirmations: number;
}

export interface UseTransactionPollingReturn<T> extends TransactionPollingResult<T> {
	startPolling: (hash: string) => void;
	stopPolling: () => void;
	resetPolling: () => void;
	txHash: string | null;
}

const DEFAULT_POLL_INTERVAL = 3000; // ms
const DEFAULT_POLL_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const useTransactionPolling = <T>(
	pollingFunction: (hash: string) => Promise<T>,
	onSuccess?: (data: T) => void,
	onError?: (error: string | null) => void,
	onFinalized?: (data: T | null) => void,
	pollInterval: number = DEFAULT_POLL_INTERVAL,
	pollTimeout: number = DEFAULT_POLL_TIMEOUT
): UseTransactionPollingReturn<T> => {
	const [txHash, setTxHash] = useState<string | null>(null);
	const [status, setStatus] = useState<PollingStatus>('idle');
	const [data, setData] = useState<T | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirmations, setConfirmations] = useState<number>(0);

	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const isActiveRef = useRef<boolean>(false);

	const cleanup = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		isActiveRef.current = false;
	}, []);

	const poll = useCallback(async (hash: string) => {
		if (!isActiveRef.current) return;

		try {
			const result = await pollingFunction(hash) as PollingResponse;

			if (!isActiveRef.current) return; // Check again after async call

			if (!result) {
				logger.info(`[useTransactionPolling] No result for tx: ${hash}, continuing...`);
				setStatus('polling');
				return;
			}

			setData(result);
			setConfirmations(result.confirmations || 0);

			// Handle error
			if (result.error) {
				const errorMessage = typeof result.error === 'string' ? result.error : 'Transaction failed';
				logger.error(`[useTransactionPolling] Transaction failed: ${errorMessage}`);
				setError(errorMessage);
				setStatus('failed');
				cleanup();
				onError?.(errorMessage);
				onFinalized?.(null);
				return;
			}

			// Handle finalized states
			if (result.finalized || result.status === 'Finalized') {
				logger.info(`[useTransactionPolling] Transaction finalized for tx: ${hash}`);
				setStatus('finalized');
				cleanup();
				onSuccess?.(result);
				onFinalized?.(result);
				return;
			}

			// Handle failed states
			if (result.status === 'Failed' || result.status === 'failed') {
				logger.error(`[useTransactionPolling] Transaction failed for tx: ${hash}`);
				setError('Transaction failed');
				setStatus('failed');
				cleanup();
				onError?.('Transaction failed');
				onFinalized?.(null);
				return;
			}

			// Handle confirmed states
			if (result.status === 'Confirmed' || result.status === 'confirmed' ||
				result.status === 'Processed' || result.status === 'processed') {
				logger.info(`[useTransactionPolling] Transaction confirmed for tx: ${hash}`);
				setStatus('confirmed');
				return; // Continue polling until finalized
			}

			// Continue polling for other states (Unknown, Pending, etc.)
			logger.info(`[useTransactionPolling] Status "${result.status}" for tx: ${hash}, continuing...`);
			setStatus('polling');

		} catch (e) {
			if (!isActiveRef.current) return;

			const errorMessage = e instanceof Error ? e.message : 'Polling failed';
			logger.error(`[useTransactionPolling] Polling error: ${errorMessage}`);
			setError(errorMessage);
			setStatus('failed');
			cleanup();
			onError?.(errorMessage);
		}
	}, [pollingFunction, cleanup, onSuccess, onError, onFinalized]);

	const startPolling = useCallback((hash: string) => {
		logger.info(`[useTransactionPolling] Starting polling for tx: ${hash}`);

		// Clean up any existing polling
		cleanup();

		// Reset state
		setTxHash(hash);
		setStatus('pending');
		setData(null);
		setError(null);
		setConfirmations(0);

		// Mark as active
		isActiveRef.current = true;

		// Start polling immediately, then on interval
		poll(hash);

		intervalRef.current = setInterval(() => {
			poll(hash);
		}, pollInterval);

		// Set timeout
		if (pollTimeout > 0) {
			timeoutRef.current = setTimeout(() => {
				if (isActiveRef.current) {
					logger.warn(`[useTransactionPolling] Polling timed out for tx: ${hash}`);
					setError('Polling timed out');
					setStatus('failed');
					cleanup();
					onError?.('Polling timed out');
				}
			}, pollTimeout);
		}
	}, [poll, pollInterval, pollTimeout, cleanup, onError]);

	const stopPolling = useCallback(() => {
		logger.info('[useTransactionPolling] Stopping polling');
		cleanup();
	}, [cleanup]);

	const resetPolling = useCallback(() => {
		logger.info('[useTransactionPolling] Resetting polling');
		cleanup();
		setTxHash(null);
		setStatus('idle');
		setData(null);
		setError(null);
		setConfirmations(0);
	}, [cleanup]);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			cleanup();
		};
	}, [cleanup]);

	return { txHash, status, data, error, confirmations, startPolling, stopPolling, resetPolling };
};
