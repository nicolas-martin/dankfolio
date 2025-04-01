import { Token } from '../../types';
import { ChartData } from './types';

const COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEEAD',
  '#D4A5A5',
  '#9FA8DA',
  '#FFE082',
  '#A5D6A7',
  '#EF9A9A',
];

export const prepareChartData = (tokens: Token[]): ChartData[] => {
  const total = tokens.reduce((sum, token) => sum + parseFloat(token.balance) * token.price, 0);

  return tokens.map((token, index) => {
    const value = parseFloat(token.balance) * token.price;
    const percentage = (value / total) * 100;

    return {
      x: token.symbol,
      y: Number(percentage.toFixed(2)),
      color: COLORS[index % COLORS.length],
      value,
    };
  });
};

export const formatBalance = (balance: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance);
}; 