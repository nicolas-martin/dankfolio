import { apiClient } from '../utils/apiClient';

interface PortfolioAsset {
  id: string;
  symbol: string;
  name: string;
  amount: number;
  value: number;
  priceChange: number;
  priceChangePercentage: number;
}

interface Portfolio {
  totalValue: number;
  changePercent: number;
  assets: PortfolioAsset[];
  stats: {
    totalProfitLoss: number;
    totalProfitLossPercent: number;
    bestPerformer: PortfolioAsset;
    worstPerformer: PortfolioAsset;
  };
}

class PortfolioService {
  async getPortfolio(userId: string): Promise<Portfolio> {
    try {
      const response = await apiClient.get(`/portfolio/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch portfolio: ${error.message}`);
    }
  }

  async getPortfolioHistory(
    userId: string,
    timeframe: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<any[]> {
    try {
      const response = await apiClient.get(`/portfolio/${userId}/history`, {
        params: { timeframe },
      });
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch portfolio history: ${error.message}`);
    }
  }

  async getAssetDetails(userId: string, assetId: string): Promise<PortfolioAsset> {
    try {
      const response = await apiClient.get(
        `/portfolio/${userId}/assets/${assetId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch asset details: ${error.message}`);
    }
  }
}

export const portfolioService = new PortfolioService(); 