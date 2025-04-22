export const formatValueChange = (valueChange: number, periodChange: number): string => {
	// Define formatPercentage locally
	const formatPercentage = (value: number): string => {
		return Math.abs(value).toFixed(2);
	};

	const arrow = valueChange >= 0 ? '↑' : '↓';
	return `${arrow} $${Math.abs(valueChange).toFixed(8)} (${formatPercentage(periodChange)}%)`;
};

export const formatPrice = (price: number): string => {
	if (price < 0.01) return price.toFixed(8);
	if (price < 1) return price.toFixed(6);
	if (price < 10) return price.toFixed(4);
	return price.toFixed(2);
};
