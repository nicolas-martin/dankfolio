import { PriceData } from '@/types';

export interface CoinChartProps {
	data: PriceData[]; // Reverted: no longer optional
	loading?: boolean; // Reverted: can be optional, or required depending on original
	period?: string;
	onHover?: (point: PricePoint | null) => void;
	// Removed coinAddress, timeframe, fetchPriceHistory
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
