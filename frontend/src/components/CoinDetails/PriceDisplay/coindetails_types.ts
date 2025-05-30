import { PricePoint } from '@components/Chart/CoinChart/types';

export interface PriceDisplayProps {
	price: number;
	periodChange: number;
	valueChange: number;
	period: string;
	resolvedIconUrl?: string;
	name?: string;
	address: string;
	hoveredPoint?: PricePoint | null;
}
