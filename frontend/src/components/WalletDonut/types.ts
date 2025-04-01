import { TokenInfo } from '../../services/api';

export interface WalletDonutProps {
  tokens: TokenInfo[];
  totalBalance: number;
}

export interface ChartData extends Record<string, unknown> {
  x: string;
  y: number;
  color: string;
  value: number;
}

export interface TokenSegment {
  token: TokenInfo;
  startAngle: number;
  endAngle: number;
  color: string;
}

export interface PieSliceProps {
  slice: {
    startAngle: number;
    endAngle: number;
    color: string;
    value: number;
    data: ChartData;
  };
} 