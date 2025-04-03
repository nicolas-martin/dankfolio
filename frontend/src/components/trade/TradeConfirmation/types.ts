export interface TradeConfirmationProps {
	isVisible: boolean;
	onClose: () => void;
	onConfirm: () => void;
	fromCoin: {
		symbol: string;
		amount: string;
		value: string;
	};
	toCoin: {
		symbol: string;
		amount: string;
		value: string;
	};
	fees: {
		gasFee: string;
		gasFeeUSD: string;
		priceImpactPct: string;
		totalFee: string;
		totalFeeUSD: string;
	};
	isLoading?: boolean;
} 