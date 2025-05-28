import { PollingStatus } from './types';

// Constants
export const CONFIRMATION_THRESHOLD = 1;

// Status text mapping
export const getStatusText = (currentStatus: PollingStatus): string => {
	switch (currentStatus) {
		case 'pending':
			return 'Submitting Transaction...';
		case 'polling':
			return 'Waiting for Confirmation...';
		case 'confirmed':
			return 'Transaction Confirmed';
		case 'finalized':
			return 'Transaction Finalized!';
		case 'failed':
			return 'Transaction Failed';
		default:
			return 'Checking Status...';
	}
};

// Status description mapping
export const getStatusDescription = (currentStatus: PollingStatus): string => {
	switch (currentStatus) {
		case 'pending':
			return 'Your transaction is being submitted to the network';
		case 'polling':
			return 'Waiting for network confirmation';
		case 'confirmed':
			return 'Waiting for final confirmation and processing';
		case 'finalized':
			return 'Your transaction is complete and irreversible';
		case 'failed':
			return 'Your transaction could not be completed';
		default:
			return 'Checking transaction status...';
	}
};

// Status type classification
export const getStatusType = (currentStatus: PollingStatus): 'loading' | 'success' | 'error' | 'warning' => {
	switch (currentStatus) {
		case 'finalized':
			return 'success';
		case 'failed':
			return 'error';
		case 'confirmed':
		case 'polling':
			return 'warning';
		default:
			return 'loading';
	}
};

// Check if status is final (no more updates expected)
export const isFinalStatus = (status: PollingStatus): boolean => {
	return status === 'finalized' || status === 'failed';
};

// Check if status is successful
export const isSuccessStatus = (status: PollingStatus): boolean => {
	return status === 'confirmed' || status === 'finalized';
};

// Check if status is in progress
export const isInProgressStatus = (status: PollingStatus): boolean => {
	return status === 'pending' || status === 'polling' || status === 'confirmed';
};

// Get confirmation progress percentage
export const getConfirmationProgress = (confirmations: number, maxConfirmations: number = 32): number => {
	return Math.min((confirmations / maxConfirmations) * 100, 100);
};

// Format confirmations text
export const formatConfirmationsText = (confirmations: number): string => {
	return `${confirmations} confirmation${confirmations !== 1 ? 's' : ''}`;
}; 

