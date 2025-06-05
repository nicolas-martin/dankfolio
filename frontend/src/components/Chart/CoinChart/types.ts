import { PriceData } from '@/types';
import { SharedValue } from 'react-native-reanimated';

export interface CoinChartProps {
	data: PriceData[]; // Reverted: no longer optional
	loading?: boolean; // Reverted: can be optional, or required depending on original
	period?: string;
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

export interface AreaProps {
	points: any;
	y0: number;
	color: string;
	opacity?: number;
	gradientColors?: string[];
}

export interface PulsatingDotProps {
	position: { x: number, y: number };
	radius: SharedValue<number>;
	color: string;
} 
