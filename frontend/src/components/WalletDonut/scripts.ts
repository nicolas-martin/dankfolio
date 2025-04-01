import { TokenInfo } from '../../services/api';
import { ChartData } from './types';

const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD'];

export const prepareChartData = (tokens: TokenInfo[]): ChartData[] => {
  const total = tokens.reduce((sum, token) => sum + token.value, 0);
  
  return tokens.map((token, index) => ({
    x: token.symbol,
    y: Math.round((token.value / total) * 100),
    color: COLORS[index % COLORS.length],
    value: token.value
  }));
};

export const formatBalance = (balance: number): string => {
  return `$${balance.toFixed(2)}`;
}; 