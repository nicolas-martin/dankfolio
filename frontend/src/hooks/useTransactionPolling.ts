import { useState, useEffect, useCallback, useRef } from 'react';
import { type Timeout } from 'node:timers';
import { logger } from '@/utils/logger'; // Assuming logger path

// Define a more generic PollingStatus to be used by the hook
export type PollingStatus = 'idle' | 'pending' | 'polling' | 'confirmed' | 'finalized' | 'failed';

// Generic interface for the expected polling result
interface PollingResponse {
	finalized?: boolean;
	error?: string | object; // Error could be string or an object with a message
	confirmations?: number;
	status?: string;
}

export interface TransactionPollingResult<T> {
	status: PollingStatus;
	data: T | null;
	error: string | null;
	confirmations: number; // Added confirmations
}

export interface UseTransactionPollingReturn<T> extends TransactionPollingResult<T> {
	startPolling: (hash: string) => void;
	stopPolling: () => void;
	resetPolling: () => void; // Added reset function
	txHash: string | null;
}

const DEFAULT_POLL_INTERVAL = 3000; // ms
const DEFAULT_POLL_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const useTransactionPolling = <T>(
	pollingFunction: (hash: string) => Promise<T>, // T should represent the structure returned by pollingFunction
	onSuccess?: (data: T) => void,
	onError?: (error: string | null) => void,
	onFinalized?: (data: T | null) => void, // Callback when transaction is finalized (success or error)
	pollInterval: number = DEFAULT_POLL_INTERVAL,
	pollTimeout: number = DEFAULT_POLL_TIMEOUT
): UseTransactionPollingReturn<T> => {
	const [txHash, setTxHash] = useState<string | null>(null);
	const [status, setStatus] = useState<PollingStatus>('idle');
	const [data, setData] = useState<T | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [confirmations, setConfirmations] = useState<number>(0);

	const pollingIntervalRef = useRef<Timeout | null>(null);
	const timeoutRef = useRef<Timeout | null>(null);

	// Store callbacks in refs to avoid them becoming stale in closures
	const onSuccessRef = useRef(onSuccess);
	const onErrorRef = useRef(onError);
	const onFinalizedRef = useRef(onFinalized);

	useEffect(() => {
		onSuccessRef.current = onSuccess;
		onErrorRef.current = onError;
		onFinalizedRef.current = onFinalized;
	}, [onSuccess, onError, onFinalized]);

	const stopPolling = useCallback((finalStatus?: PollingStatus) => {
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
		}
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
			timeoutRef.current = null;
		}
		if (finalStatus) {
			setStatus(finalStatus);
			if (finalStatus === 'finalized' && data) {
				onFinalizedRef.current?.(data);
			} else if (finalStatus === 'failed') {
				onFinalizedRef.current?.(null); // Or pass error if preferred
			}
		}
		logger.info(`[useTransactionPolling] Polling stopped for tx: ${txHash}. Status: ${finalStatus || status}`);
	}, [txHash, status, data]);

	const resetPolling = useCallback(() => {
		stopPolling();
		setTxHash(null);
		setStatus('idle');
		setData(null);
		setError(null);
		setConfirmations(0);
		logger.info('[useTransactionPolling] Polling reset.');
	}, [stopPolling]);

	const performPoll = useCallback(async (currentTxHash: string) => {
		logger.info(`[useTransactionPolling] Polling for tx: ${currentTxHash}, Current status: ${status}`);
		try {
			// Assuming T is the response type from pollingFunction, e.g., grpcApi.getSwapStatus
			// Example structure of T (based on Send/scripts.ts):
			// { finalized: boolean, error?: string, confirmations: number, status: string (e.g. "confirmed", "processed") }
			const result = await pollingFunction(currentTxHash) as PollingResponse;

			if (!result) {
				logger.info(`[useTransactionPolling] Transaction status not found for ${currentTxHash}, continuing poll.`);
				setStatus('polling'); // Or keep current status if preferred
				return;
			}

			setData(result); // Store the full result as data
			setConfirmations(result.confirmations || 0);

			if (result.error) {
				let resultErrorMessage = 'An unknown error occurred during polling.';
				if (typeof result.error === 'string') {
					resultErrorMessage = result.error;
				} else if (typeof result.error === 'object' && result.error !== null && 'message' in result.error && typeof result.error.message === 'string') {
					resultErrorMessage = result.error.message;
				} else if (result.error) {
					try {
						resultErrorMessage = JSON.stringify(result.error);
					} catch {
						// If stringify fails, keep the default message
					}
				}
				logger.error(`[useTransactionPolling] Transaction failed for ${currentTxHash}:`, { error: resultErrorMessage });
				setError(resultErrorMessage);
				onErrorRef.current?.(resultErrorMessage);
				stopPolling('failed');
			} else if (result.finalized) {
				logger.info(`[useTransactionPolling] Transaction finalized for ${currentTxHash}.`);
				setStatus('finalized');
				onSuccessRef.current?.(result); // Pass the full result
				stopPolling('finalized');
			} else if (result.status === 'confirmed' || result.status === 'processed') {
				logger.info(`[useTransactionPolling] Transaction confirmed for ${currentTxHash} with ${result.confirmations} confirmations.`);
				setStatus('confirmed');
			} else {
				logger.info(`[useTransactionPolling] Current status for ${currentTxHash}: ${result.status}, continuing poll.`);
				setStatus('polling');
			}
		} catch (e) {
			const errorMessage = e instanceof Error ? e.message : String(e || 'Polling failed');
			logger.error(`[useTransactionPolling] Exception during poll for ${currentTxHash}:`, { message: errorMessage });
			setError(errorMessage);
			onErrorRef.current?.(errorMessage);
			stopPolling('failed');
		}
	}, [pollingFunction, stopPolling, status]); // Added status to dependencies of performPoll

	const startPolling = useCallback((hash: string) => {
		logger.info(`[useTransactionPolling] Starting polling for tx: ${hash}`);
		resetPolling(); // Reset previous state before starting new
		setTxHash(hash);
		setStatus('pending'); // Initial status before first poll

		// Perform first poll immediately
		performPoll(hash);

		pollingIntervalRef.current = setInterval(() => performPoll(hash), pollInterval);

		if (pollTimeout > 0) {
			timeoutRef.current = setTimeout(() => {
				logger.warn(`[useTransactionPolling] Polling timed out for tx: ${hash}`);
				if (status !== 'finalized' && status !== 'failed') {
					setError('Polling timed out.');
					onErrorRef.current?.('Polling timed out.');
					stopPolling('failed');
				}
			}, pollTimeout);
		}
	}, [resetPolling, performPoll, pollInterval, pollTimeout, status]); // Added status

	useEffect(() => {
		// Cleanup on unmount
		return () => {
			stopPolling();
		};
	}, [stopPolling]);

	return { txHash, status, data, error, confirmations, startPolling, stopPolling, resetPolling };
};
