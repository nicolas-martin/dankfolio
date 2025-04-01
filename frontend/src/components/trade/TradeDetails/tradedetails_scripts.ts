import { formatPct } from "../../../utils/numberFormat"

export const formatExchangeRate = (rate: string): string => `Rate: ${rate}`;
export const formatGasFee = (fee: string): string => `Network Fee: ${fee} SOL`;
export const formatPriceImpactPct = (priceImpact: string): string => `Price Impact: ${formatPct(priceImpact, 4)}%`;
