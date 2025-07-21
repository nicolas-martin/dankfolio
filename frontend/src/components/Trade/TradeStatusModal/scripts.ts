import { PollingStatus } from '@/types/transactions';

// Constants
export const CONFIRMATION_THRESHOLD = 1;

// Status text mapping
export const getStatusText = (currentStatus: PollingStatus): string => {
	switch (currentStatus) {
		case PollingStatus.PENDING:
			return 'Submitting Transaction...';
		case PollingStatus.POLLING:
			return 'Waiting for Confirmation...';
		case PollingStatus.CONFIRMED:
			return 'Transaction Confirmed';
		case PollingStatus.FINALIZED:
			return 'Transaction Finalized!';
		case PollingStatus.FAILED:
			return 'Transaction Failed';
		default:
			return 'Checking Status...';
	}
};

// Status description mapping
export const getStatusDescription = (currentStatus: PollingStatus): string => {
	switch (currentStatus) {
		case PollingStatus.PENDING:
			return 'Your transaction is being submitted to the network';
		case PollingStatus.POLLING:
			return 'Waiting for network confirmation';
		case PollingStatus.CONFIRMED:
			return 'Waiting for final confirmation and processing';
		case PollingStatus.FINALIZED:
			return 'Your transaction is complete and irreversible';
		case PollingStatus.FAILED:
			return 'Your transaction could not be completed';
		default:
			return 'Checking transaction status...';
	}
};

// Status type classification
export const getStatusType = (currentStatus: PollingStatus): 'loading' | 'success' | 'error' | 'warning' => {
	switch (currentStatus) {
		case PollingStatus.FINALIZED:
			return 'success';
		case PollingStatus.FAILED:
			return 'error';
		case PollingStatus.CONFIRMED:
		case PollingStatus.POLLING:
			return 'warning';
		default:
			return 'loading';
	}
};

// Check if status is final (no more updates expected)
export const isFinalStatus = (status: PollingStatus): boolean => {
	return status === PollingStatus.FINALIZED || status === PollingStatus.FAILED;
};

// Check if status is successful
export const isSuccessStatus = (status: PollingStatus): boolean => {
	return status === PollingStatus.CONFIRMED || status === PollingStatus.FINALIZED;
};

// Check if status is in progress
export const isInProgressStatus = (status: PollingStatus): boolean => {
	return status === PollingStatus.PENDING || status === PollingStatus.POLLING || status === PollingStatus.CONFIRMED;
};

// Get confirmation progress percentage
export const getConfirmationProgress = (confirmations: number, maxConfirmations: number = 32): number => {
	return Math.min((confirmations / maxConfirmations) * 100, 100);
};

// Format confirmations text
export const formatConfirmationsText = (confirmations: number): string => {
	return `${confirmations} confirmation${confirmations !== 1 ? 's' : ''}`;
}; 

