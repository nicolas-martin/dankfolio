export const fetchTradeQuote = jest.fn();
export const signTradeTransaction = jest.fn().mockResolvedValue('mock_signed_tx');
export const handleSwapCoins = jest.fn();
export const DEFAULT_AMOUNT = "0.0001";
export const QUOTE_DEBOUNCE_MS = 500;

// Mock executeTrade with default successful implementation
export const executeTrade = jest.fn().mockImplementation(
	async (fromCoin, toCoin, amount, slippage, showToast, ...setters) => {
		const [
			setIsLoadingTrade,
			setIsConfirmationVisible,
			setPollingStatus,
			setSubmittedTxHash,
			setPollingError,
			setPollingConfirmations,
			setIsStatusModalVisible,
			startPollingFn
		] = setters;

		// Simulate trade execution flow
		if (typeof setIsLoadingTrade === 'function') setIsLoadingTrade(true);
		if (typeof setIsConfirmationVisible === 'function') setIsConfirmationVisible(false);
		if (typeof setPollingStatus === 'function') setPollingStatus('pending');
		if (typeof setSubmittedTxHash === 'function') setSubmittedTxHash('mock_tx_hash');
		if (typeof setIsStatusModalVisible === 'function') setIsStatusModalVisible(true);

		// Show success toast
		showToast({ type: 'success', message: 'Trade executed successfully!' });

		// Simulate polling start
		if (typeof startPollingFn === 'function') startPollingFn('mock_tx_hash');

		// Complete trade
		if (typeof setIsLoadingTrade === 'function') setIsLoadingTrade(false);
		if (typeof setPollingStatus === 'function') setPollingStatus('finalized');
		if (typeof setPollingConfirmations === 'function') setPollingConfirmations(32);
	}
);

export const startPolling = jest.fn();
export const pollTradeStatus = jest.fn();
export const stopPolling = jest.fn();
export const getCoinPrices = jest.fn(); 