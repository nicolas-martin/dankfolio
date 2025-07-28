import { create } from '@bufbuild/protobuf';
import type { PriceHistoryItem } from '@/gen/dankfolio/v1/price_pb';
import { PriceHistoryItemSchema } from '@/gen/dankfolio/v1/price_pb';

// Generate realistic price history with random walk
export function generatePriceHistory(basePrice: number, isStablecoin = false): PriceHistoryItem[] {
	const items: PriceHistoryItem[] = [];
	const now = Date.now();
	const fourHoursAgo = now - (4 * 60 * 60 * 1000); // 4 hours ago
	const interval = (4 * 60 * 60 * 1000) / 24; // 24 data points over 4 hours

	let currentPrice = basePrice;
	const volatility = isStablecoin ? 0.001 : 0.05; // 0.1% for stablecoins, 5% for others
	const meanReversion = 0.1; // Tendency to revert to base price

	for (let i = 0; i < 24; i++) {
		const timestamp = fourHoursAgo + (i * interval);

		// Random walk with mean reversion
		const randomChange = (Math.random() - 0.5) * 2 * volatility;
		const meanReversionForce = (basePrice - currentPrice) * meanReversion * volatility;
		const priceChange = randomChange + meanReversionForce;

		currentPrice = Math.max(currentPrice * (1 + priceChange), basePrice * 0.5); // Prevent going below 50% of base
		currentPrice = Math.min(currentPrice, basePrice * 2); // Prevent going above 200% of base

		items.push(create(PriceHistoryItemSchema, {
			unixTime: BigInt(Math.floor(timestamp / 1000)).toString(), // Convert to seconds and BigInt as per protobuf
			value: currentPrice,
		}));
	}

	return items;
}
