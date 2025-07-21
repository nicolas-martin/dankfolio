import { PollingStatus } from '@/types/transactions';

export { PollingStatus };

export interface TradeStatusModalProps {
	isVisible: boolean;
	onClose: () => void;
	onTryAgain?: () => void;
	txHash: string | null;
	status: PollingStatus;
	confirmations: number;
	error: string | null;
}
