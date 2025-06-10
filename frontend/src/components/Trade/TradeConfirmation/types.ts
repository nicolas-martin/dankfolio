import { Coin } from '@/types';

interface TradeConfirmationProps {
	isVisible: boolean;
	onClose: () => void;
	onConfirm: () => void;
	fromAmount: string;
	toAmount: string;
	fromToken: Coin;
	toToken?: Coin;
	fees: {
		gasFee: string;
		priceImpactPct: string;
		totalFee: string;
		route?: string;
	};
	isLoading?: boolean;
	operationType?: 'swap' | 'send';
	recipientAddress?: string;
}

export type { TradeConfirmationProps }; 
