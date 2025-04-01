import { PriceData } from '../../../types';
import type { MaybeNumber } from 'victory-native/dist/types';

export interface CoinChartProps {
  data: PriceData[];
  period?: string;
}

export interface PricePoint extends Record<string, unknown> {
  timestamp: number;
  price: number;
  value: number;
  x: number;
  y: number;
}

export interface ChartBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
} 