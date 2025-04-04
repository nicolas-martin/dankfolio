import { Coin } from '@/types';

interface TradeConfirmationProps {
	isVisible: boolean;
	onClose: () => void;
	onConfirm: () => void;
	fromCoin: {
		id: string;
		symbol: string;
		amount: string;
	};
	toCoin: {
		id: string;
		symbol: string;
		amount: string;
	};
	fees: {
		gasFee: string;
		priceImpactPct: string;
		totalFee: string;
		route?: string;
	};
	isLoading?: boolean;
}

export type { TradeConfirmationProps }; 
