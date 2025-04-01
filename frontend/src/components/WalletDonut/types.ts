import { Token } from '../../types';

export interface WalletDonutProps {
  tokens: Token[];
  totalBalance: number;
}

export interface ChartData extends Record<string, unknown> {
  x: string;
  y: number;
  color: string;
  value: number;
}

export interface PieSliceData {
  startAngle: number;
  endAngle: number;
  color: string;
  value: number;
  x: string;
  y: number;
}

export interface PieSliceProps {
  slice: PieSliceData;
}

export interface PieEventProps {
  slice: PieSliceData;
} 