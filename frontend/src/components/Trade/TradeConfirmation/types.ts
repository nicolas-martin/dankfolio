import { Coin } from '@/types';
import { TradeDetailsProps } from '@components/Trade/TradeDetails/tradedetails_types';

interface TradeConfirmationProps {
	isVisible: boolean;
	onClose: () => void;
	onConfirm: () => void;
	fromAmount: string;
	toAmount: string;
	fromToken: Coin;
	toToken?: Coin;
	fees: TradeDetailsProps;
	isLoading?: boolean;
	operationType?: 'swap' | 'send';
	recipientAddress?: string;
}

export type { TradeConfirmationProps }; 
