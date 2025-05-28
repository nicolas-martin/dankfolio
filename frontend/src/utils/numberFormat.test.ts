import {
	toRawAmount,
	formatNumber,
	formatPrice,
	formatPercentage,
	formatVolume,
	formatTokenBalance,
	formatValueChange,
	formatAddress,
	formatPct
} from './numberFormat';

describe('Number Formatting Utilities', () => {
	describe('toRawAmount', () => {
		it('converts human-readable amounts to raw blockchain amounts', () => {
			expect(toRawAmount('1.5', 6)).toBe('1500000');
			expect(toRawAmount('0.000001', 6)).toBe('1');
			expect(toRawAmount('1000', 9)).toBe('1000000000000');
		});

		it('handles commas in input', () => {
			expect(toRawAmount('1,000.5', 6)).toBe('1000500000');
		});
	});

	describe('formatNumber', () => {
		it('formats numbers with K/M/B suffixes', () => {
			expect(formatNumber(123)).toBe('123.00');
			expect(formatNumber(12345)).toBe('12.35K');
			expect(formatNumber(1234567)).toBe('1.23M');
			expect(formatNumber(1234567890)).toBe('1.23B');
		});

		it('handles dollar sign prefix', () => {
			expect(formatNumber(123, true)).toBe('$123.00');
			expect(formatNumber(12345, true)).toBe('$12.35K');
		});

		it('handles null/undefined values', () => {
			expect(formatNumber(null)).toBe('N/A');
			expect(formatNumber(undefined)).toBe('N/A');
		});
	});

	describe('formatPrice', () => {
		it('formats prices with appropriate decimal places', () => {
			expect(formatPrice(0)).toBe('$0.00');
			expect(formatPrice(0.000001)).toBe('$0.00000100');
			expect(formatPrice(0.1)).toBe('$0.100000');
			expect(formatPrice(1.23)).toBe('$1.2300');
			expect(formatPrice(12.34)).toBe('$12.34');
			expect(formatPrice(1234.56)).toBe('$1.23K');
			expect(formatPrice(1234567.89)).toBe('$1.23M');
		});

		it('handles very small numbers with fixed decimals', () => {
			expect(formatPrice(0.000001)).toBe('$0.00000100');
			expect(formatPrice(0.00000001)).toBe('$0.00000001');
		});

		it('handles null/undefined values', () => {
			expect(formatPrice(null)).toBe('N/A');
			expect(formatPrice(undefined)).toBe('N/A');
		});

		it('respects includeDollarSign parameter', () => {
			expect(formatPrice(123.45, false)).toBe('123.45');
		});
	});

	describe('formatPercentage', () => {
		it('formats percentages with sign and decimals', () => {
			expect(formatPercentage(1.2345)).toBe('+1.23%');
			expect(formatPercentage(-1.2345)).toBe('-1.23%');
			expect(formatPercentage(0)).toBe('0.00%');
		});

		it('handles custom decimal places', () => {
			expect(formatPercentage(1.2345, 3)).toBe('+1.234%');
		});

		it('handles sign inclusion option', () => {
			expect(formatPercentage(1.2345, 2, false)).toBe('1.23%');
			expect(formatPercentage(-1.2345, 2, false)).toBe('-1.23%');
		});

		it('handles null/undefined values', () => {
			expect(formatPercentage(null)).toBe('N/A');
			expect(formatPercentage(undefined)).toBe('N/A');
		});
	});

	describe('formatVolume', () => {
		it('formats volume with appropriate suffixes', () => {
			expect(formatVolume(123)).toBe('$123');
			expect(formatVolume(12345)).toBe('$12.3K');
			expect(formatVolume(1234567)).toBe('$1.2M');
			expect(formatVolume(1234567890)).toBe('$1.2B');
		});

		it('handles null/undefined values', () => {
			expect(formatVolume(null)).toBe('N/A');
			expect(formatVolume(undefined)).toBe('N/A');
		});

		it('respects includeDollarSign parameter', () => {
			expect(formatVolume(12345, false)).toBe('12.3K');
		});
	});

	describe('formatTokenBalance', () => {
		it('formats token balances with appropriate decimals', () => {
			expect(formatTokenBalance(1234.5678, 2)).toBe('1,234.57');
			expect(formatTokenBalance(1234.5678, 4)).toBe('1,234.5678');
		});

		it('handles zero values', () => {
			expect(formatTokenBalance(0)).toBe('0');
		});
	});

	describe('formatValueChange', () => {
		it('formats value changes with arrow indicators', () => {
			expect(formatValueChange(100, 5)).toBe('↑ $100.00 (5.00%)');
			expect(formatValueChange(-100, -5)).toBe('↓ $100.00 (5.00%)');
		});

		it('handles zero values', () => {
			expect(formatValueChange(0, 0)).toBe('↑ $0.00 (0.00%)');
		});
	});

	describe('formatAddress', () => {
		it('formats wallet addresses', () => {
			expect(formatAddress('0x1234567890abcdef1234567890abcdef12345678'))
				.toBe('0x12...5678');
		});

		it('handles custom character counts', () => {
			expect(formatAddress('0x1234567890abcdef1234567890abcdef12345678', 6, 8))
				.toBe('0x1234...12345678');
		});

		it('handles empty addresses', () => {
			expect(formatAddress('')).toBe('');
		});
	});

	describe('formatPct', () => {
		it('formats percentage strings', () => {
			expect(formatPct('1.2345')).toBe('1.23');
			expect(formatPct('0')).toBe('0.0000');
		});

		it('handles custom decimal places', () => {
			expect(formatPct('1.2345', 3)).toBe('1.234');
		});
	});
}); 
