export interface SolFeeBreakdown {
	tradingFee: string;        // Route + platform fees in SOL
	transactionFee: string;    // Basic transaction cost
	accountCreationFee: string; // ATA creation costs
	priorityFee: string;       // Transaction prioritization fee
	total: string;             // Sum of all SOL fees
	accountsToCreate: number;  // Number of ATAs to create
}

export interface TradeDetailsProps {
	exchangeRate: string;
	gasFee: string;
	priceImpactPct: string;
	totalFee: string;
	route?: string;
	solFeeBreakdown?: SolFeeBreakdown; // Enhanced SOL fee breakdown
	totalSolRequired?: string;         // Total SOL needed for transaction
	tradingFeeSol?: string;           // Trading fees in SOL
}
