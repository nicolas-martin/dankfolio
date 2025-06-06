import { PriceData } from '@/types';
import { PricePoint } from './types';
import { withRepeat, withTiming, Easing } from 'react-native-reanimated';

export const prepareChartData = (data: PriceData[]): PricePoint[] => {
	return data.map(point => {
		const timestamp = new Date(point.timestamp).valueOf();
		const value = typeof point.value === 'string' ? parseFloat(point.value) : point.value;
		return {
			timestamp,
			price: value,
			value,
			x: timestamp,
			y: value
		};
	});
};

export const formatPrice = (price: number): string => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 6,
	}).format(price);
}; 

export const determineChartColor = (data: PricePoint[]): 'green' | 'red' => {
	if (!data || data.length < 2) return 'green';
	const firstValue = data[0].value;
	const lastValue = data[data.length - 1].value;
	return lastValue >= firstValue ? 'green' : 'red';
};

export const createPulsateAnimation = (animatedValue: any) => {
	return withRepeat(
		withTiming(1.2, { 
			duration: 1000,
			easing: Easing.inOut(Easing.ease)
		}),
		-1, // Infinite repetitions
		true // Reverse
	);
};

// Updated chart colors with simpler format
export const CHART_COLORS = {
    green: {
        line: '#0BA360',
        area: 'rgba(11, 163, 96, 0.5)',
        indicator: '#0BA360',
        glow: '#0BA360'
    },
    red: {
        line: '#E04E4A',
        area: 'rgba(224, 78, 74, 0.5)',
        indicator: '#E04E4A',
        glow: '#E04E4A'
    }
}; 

// Export a simpler version of chart colors for use in other components
export const TREND_COLORS = {
    positive: '#0BA360', // Green color for positive trends
    negative: '#E04E4A'  // Red color for negative trends
}; 
