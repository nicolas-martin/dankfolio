export const fetchTradeQuote = jest.fn();
export const signTradeTransaction = jest.fn().mockResolvedValue('mock_signed_tx');
export const handleSwapCoins = jest.fn();
export const DEFAULT_AMOUNT = "0.0001";
export const QUOTE_DEBOUNCE_MS = 500; 