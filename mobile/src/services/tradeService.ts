import { PublicKey } from '@solana/web3.js';
import { walletService } from './walletService';
import { apiClient } from '../utils/apiClient';

interface TradeParams {
  coinId: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
}

interface TradePreview {
  estimatedTotal: number;
  fee: number;
  slippage: number;
  finalAmount: number;
}

class TradeService {
  async previewTrade(params: TradeParams): Promise<TradePreview> {
    try {
      const response = await apiClient.post('/trades/preview', params);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to preview trade: ${error.message}`);
    }
  }

  async executeTrade(params: TradeParams): Promise<string> {
    try {
      // Get trade instructions from backend
      const { instructions, tokenMint } = await apiClient.post('/trades/prepare', params);
      
      // Execute the trade transaction
      const signature = await walletService.sendTransaction(
        instructions.recipient,
        instructions.amount,
        tokenMint
      );

      // Confirm trade on backend
      await apiClient.post('/trades/confirm', {
        ...params,
        signature,
      });

      return signature;
    } catch (error) {
      throw new Error(`Trade execution failed: ${error.message}`);
    }
  }

  async getTradeHistory(userId: string): Promise<any[]> {
    try {
      const response = await apiClient.get(`/trades/history/${userId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch trade history: ${error.message}`);
    }
  }
}

export const tradeService = new TradeService(); 