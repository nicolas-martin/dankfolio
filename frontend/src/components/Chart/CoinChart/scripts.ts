import { PriceData } from '../../../types';
import { PricePoint } from './types';

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
