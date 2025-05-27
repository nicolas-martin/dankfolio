import { PriceData } from '@/types';

export interface CoinChartProps {
	data: PriceData[];
	period?: string;
	loading?: boolean;
	onHover?: (point: PricePoint | null) => void;
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
