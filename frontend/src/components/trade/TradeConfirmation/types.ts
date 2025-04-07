import { Coin } from '@/types';

interface TradeConfirmationProps {
	isVisible: boolean;
	onClose: () => void;
	onConfirm: () => void;
	fromAmount: string;
	toAmount: string;
	fromCoin: Coin;
	toCoin: Coin;
	fees: {
		gasFee: string;
		priceImpactPct: string;
		totalFee: string;
		route?: string;
	};
	isLoading?: boolean;
}

export type { TradeConfirmationProps }; 
