import { PortfolioToken } from '@/store/portfolio';

export interface PnLData {
	token: PortfolioToken;
	currentValue: number;
	costBasis: number;
	unrealizedPnL: number;
	pnlPercentage: number;
	hasPurchaseData: boolean;
}

export interface PortfolioStats {
	totalValue: number;
	totalCostBasis: number;
	totalUnrealizedPnL: number;
	totalPnLPercentage: number;
	totalHoldings: number;
}