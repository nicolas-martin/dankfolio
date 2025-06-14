export type PollingStatus = 'idle' | 'pending' | 'polling' | 'confirmed' | 'finalized' | 'failed';

export interface TradeStatusModalProps {
	isVisible: boolean;
	onClose: () => void;
	onTryAgain?: () => void;
	txHash: string | null;
	status: PollingStatus;
	confirmations: number;
	error: string | null;
}
