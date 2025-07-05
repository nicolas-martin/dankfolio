import { grpcApi } from '@/services/grpcApi';
import { prepareSwapRequest, signSwapTransaction, getActiveWalletKeys } from '@/services/solana';
import { usePortfolioStore } from '@/store/portfolio';
import * as logger from '@/utils/logger';
// Assuming this can be used for trade details
import { Coin } from '@/types';
import { fetchTradeQuote, executeTrade } from './scripts'; // The functions to test

// Mock dependencies
jest.mock('@/services/grpcApi');
jest.mock('@/services/solana');
jest.mock('@/store/portfolio');
jest.mock('@/utils/logger');

const mockFromCoin: Coin = {
	mintAddress: 'fromCoinMint',
	symbol: 'FROM',
	name: 'From Coin',
	price: 10,
	decimals: 6,
	logoURI: 'from.png',
	description: '',
	tags: [],
	dailyVolume: 0,
	createdAt: new Date(),
};

const mockToCoin: Coin = {
	mintAddress: 'toCoinMint',
	symbol: 'TO',
	name: 'To Coin',
	price: 5,
	decimals: 8,
	logoURI: 'to.png',
	description: '',
	tags: [],
	dailyVolume: 0,
	createdAt: new Date(),
};

const mockWallet = {
	address: 'mockWalletAddress',
	// other wallet properties if needed by getActiveWalletKeys
};

const mockActiveKeys = {
	publicKey: 'mockPublicKey',
	privateKey: 'mockPrivateKey', // Adjust if Base58PrivateKey type is enforced
	mnemonic: 'mockMnemonic',
};

describe('Trade Screen Scripts', () => {
	let mockSetQuoteLoading: jest.Mock;
	let mockSetToAmount: jest.Mock;
	let mockSetTradeDetails: jest.Mock;
	let mockSetIsLoadingTrade: jest.Mock;
	let mockSetIsConfirmationVisible: jest.Mock;
	let mockSetPollingStatus: jest.Mock;
	let mockSetSubmittedTxHash: jest.Mock;
	let mockSetPollingError: jest.Mock;
	let mockSetPollingConfirmations: jest.Mock;
	let mockSetIsStatusModalVisible: jest.Mock;
	let mockStartPollingFn: jest.Mock;
	let mockShowToast: jest.Mock;

	beforeEach(() => {
		// Reset all mocks before each test
		jest.clearAllMocks();

		mockSetQuoteLoading = jest.fn();
		mockSetToAmount = jest.fn();
		mockSetTradeDetails = jest.fn();
		mockSetIsLoadingTrade = jest.fn();
		mockSetIsConfirmationVisible = jest.fn();
		mockSetPollingStatus = jest.fn();
		mockSetSubmittedTxHash = jest.fn();
		mockSetPollingError = jest.fn();
		mockSetPollingConfirmations = jest.fn();
		mockSetIsStatusModalVisible = jest.fn();
		mockStartPollingFn = jest.fn();
		mockShowToast = jest.fn();

		// Setup default mock implementations
		(usePortfolioStore.getState as jest.Mock).mockReturnValue({
			wallet: mockWallet,
			// other store state if needed
		});
		(getActiveWalletKeys as jest.Mock).mockResolvedValue(mockActiveKeys);
	});

	describe('fetchTradeQuote', () => {
		it('should fetch and set quote successfully', async () => {
			(grpcApi.getCoinPrices as jest.Mock).mockResolvedValue({
				[mockFromCoin.mintAddress]: mockFromCoin.price,
				[mockToCoin.mintAddress]: mockToCoin.price,
			});
			const mockQuoteResponse = {
				estimatedAmount: '19.8', // FromCoin price 10, ToCoin price 5, amount 10 => 10*10/5 = 20 (approx)
				exchangeRate: '1.98', // estimatedAmount / fromAmount (10)
				fee: '0.02',
				priceImpact: '0.1',
				routePlan: 'RouteA->RouteB',
				inputMint: mockFromCoin.mintAddress,
				outputMint: mockToCoin.mintAddress,
			};
			(grpcApi.getSwapQuote as jest.Mock).mockResolvedValue(mockQuoteResponse);

			await fetchTradeQuote(
				'10', // amount
				mockFromCoin,
				mockToCoin,
				mockSetQuoteLoading,
				mockSetToAmount,
				mockSetTradeDetails,
			);

			expect(mockSetQuoteLoading).toHaveBeenCalledWith(true);
			expect(grpcApi.getCoinPrices).toHaveBeenCalledWith([mockFromCoin.mintAddress, mockToCoin.mintAddress]);
			expect(grpcApi.getSwapQuote).toHaveBeenCalledWith(mockFromCoin.mintAddress, mockToCoin.mintAddress, '10000000'); // 10 * 10^6 (fromCoin.decimals)
			expect(mockSetToAmount).toHaveBeenCalledWith(mockQuoteResponse.estimatedAmount);
			expect(mockSetTradeDetails).toHaveBeenCalledWith({
				fromAmount: '10',
				toAmount: mockQuoteResponse.estimatedAmount,
				exchangeRate: mockQuoteResponse.exchangeRate,
				priceImpact: mockQuoteResponse.priceImpact,
				fee: mockQuoteResponse.fee,
				routePlan: mockQuoteResponse.routePlan,
				inputMint: mockQuoteResponse.inputMint,
				outputMint: mockQuoteResponse.outputMint,
				fromCoinPrice: mockFromCoin.price,
				toCoinPrice: mockToCoin.price,
			});
			expect(mockSetQuoteLoading).toHaveBeenCalledWith(false);
		});

		it('should handle API error during quote fetching', async () => {
			(grpcApi.getCoinPrices as jest.Mock).mockResolvedValue({
				[mockFromCoin.mintAddress]: mockFromCoin.price,
				[mockToCoin.mintAddress]: mockToCoin.price,
			});
			const apiError = new Error('Failed to fetch quote');
			(grpcApi.getSwapQuote as jest.Mock).mockRejectedValue(apiError);

			await expect(
				fetchTradeQuote(
					'10',
					mockFromCoin,
					mockToCoin,
					mockSetQuoteLoading,
					mockSetToAmount,
					mockSetTradeDetails,
				),
			).rejects.toThrow('Failed to fetch quote'); // Or check logger.exception

			expect(mockSetQuoteLoading).toHaveBeenCalledWith(true);
			expect(mockSetTradeDetails).toHaveBeenCalledWith(expect.objectContaining({ exchangeRate: '0' })); // Reset details
			expect(mockSetQuoteLoading).toHaveBeenCalledWith(false);
			expect(logger.exception).toHaveBeenCalledWith(apiError, expect.any(String), expect.any(Object));
		});

		it('should return early for zero amount', async () => {
			await fetchTradeQuote('0', mockFromCoin, mockToCoin, mockSetQuoteLoading, mockSetToAmount, mockSetTradeDetails);
			expect(grpcApi.getCoinPrices).not.toHaveBeenCalled();
			expect(grpcApi.getSwapQuote).not.toHaveBeenCalled();
			expect(mockSetQuoteLoading).not.toHaveBeenCalled();
		});

		it('should return early for invalid amount', async () => {
			await fetchTradeQuote('invalid', mockFromCoin, mockToCoin, mockSetQuoteLoading, mockSetToAmount, mockSetTradeDetails);
			expect(grpcApi.getCoinPrices).not.toHaveBeenCalled();
			expect(grpcApi.getSwapQuote).not.toHaveBeenCalled();
		});

		it('should return early if fromCoin is null', async () => {
			await fetchTradeQuote('10', null, mockToCoin, mockSetQuoteLoading, mockSetToAmount, mockSetTradeDetails);
			expect(grpcApi.getCoinPrices).not.toHaveBeenCalled();
			expect(grpcApi.getSwapQuote).not.toHaveBeenCalled();
		});

		it('should return early if toCoin is null', async () => {
			await fetchTradeQuote('10', mockFromCoin, null, mockSetQuoteLoading, mockSetToAmount, mockSetTradeDetails);
			expect(grpcApi.getCoinPrices).not.toHaveBeenCalled();
			expect(grpcApi.getSwapQuote).not.toHaveBeenCalled();
		});
	});

	describe('executeTrade', () => {
		const mockTradeDetails = {
			fromAmount: '10',
			toAmount: '19.8',
			exchangeRate: '1.98',
			priceImpact: '0.1',
			fee: '0.02',
			routePlan: 'RouteA->RouteB',
			inputMint: mockFromCoin.mintAddress,
			outputMint: mockToCoin.mintAddress,
			fromCoinPrice: mockFromCoin.price,
			toCoinPrice: mockToCoin.price,
		};
		const mockSlippage = '0.5'; // 0.5%

		it('should execute trade successfully', async () => {
			const mockUnsignedTx = 'unsignedTransactionString';
			const mockSignedTx = 'signedTransactionString';
			(prepareSwapRequest as jest.Mock).mockResolvedValue(mockUnsignedTx);
			(signSwapTransaction as jest.Mock).mockResolvedValue(mockSignedTx);
			(grpcApi.submitSwap as jest.Mock).mockResolvedValue({ transactionHash: 'mockTxHash' });

			await executeTrade(
				mockTradeDetails,
				mockFromCoin,
				mockToCoin,
				mockSlippage,
				mockSetIsLoadingTrade,
				mockSetIsConfirmationVisible,
				mockSetPollingStatus,
				mockSetSubmittedTxHash,
				mockSetPollingError,
				mockSetPollingConfirmations,
				mockSetIsStatusModalVisible,
				mockStartPollingFn,
				mockShowToast,
			);

			expect(mockSetIsLoadingTrade).toHaveBeenCalledWith(true);
			expect(getActiveWalletKeys).toHaveBeenCalled();
			expect(prepareSwapRequest).toHaveBeenCalledWith(
				mockActiveKeys.publicKey,
				mockTradeDetails.inputMint,
				mockTradeDetails.outputMint,
				mockTradeDetails.fromAmount,
				parseFloat(mockSlippage) * 100, // slippageBps
			);
			expect(signSwapTransaction).toHaveBeenCalledWith(mockUnsignedTx, mockActiveKeys.privateKey);
			expect(grpcApi.submitSwap).toHaveBeenCalledWith({
				fromCoinMintAddress: mockTradeDetails.inputMint,
				toCoinMintAddress: mockTradeDetails.outputMint,
				amount: parseFloat(mockTradeDetails.fromAmount),
				signedTransaction: mockSignedTx,
				unsignedTransaction: mockUnsignedTx,
			});
			expect(mockSetSubmittedTxHash).toHaveBeenCalledWith('mockTxHash');
			expect(mockSetIsStatusModalVisible).toHaveBeenCalledWith(true);
			expect(mockStartPollingFn).toHaveBeenCalledWith('mockTxHash');
			expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Trade submitted'), 'success');
			// setIsLoadingTrade(false) might be called later in the actual flow due to async polling not mocked here
		});

		it('should handle wallet not connected', async () => {
			(usePortfolioStore.getState as jest.Mock).mockReturnValue({ wallet: null });
			await executeTrade(mockTradeDetails, mockFromCoin, mockToCoin, mockSlippage, mockSetIsLoadingTrade, mockSetIsConfirmationVisible, mockSetPollingStatus, mockSetSubmittedTxHash, mockSetPollingError, mockSetPollingConfirmations, mockSetIsStatusModalVisible, mockStartPollingFn, mockShowToast);
			expect(mockSetIsLoadingTrade).toHaveBeenCalledWith(false);
			expect(mockShowToast).toHaveBeenCalledWith('Wallet not connected. Please connect your wallet.', 'error');
			expect(prepareSwapRequest).not.toHaveBeenCalled();
		});

		it('should handle failed to get active wallet keys', async () => {
			(getActiveWalletKeys as jest.Mock).mockResolvedValue(null);
			await executeTrade(mockTradeDetails, mockFromCoin, mockToCoin, mockSlippage, mockSetIsLoadingTrade, mockSetIsConfirmationVisible, mockSetPollingStatus, mockSetSubmittedTxHash, mockSetPollingError, mockSetPollingConfirmations, mockSetIsStatusModalVisible, mockStartPollingFn, mockShowToast);
			expect(mockSetIsLoadingTrade).toHaveBeenCalledWith(false);
			expect(mockShowToast).toHaveBeenCalledWith('Failed to get active wallet keys.', 'error');
			expect(prepareSwapRequest).not.toHaveBeenCalled();
		});

		it('should handle grpcApi.submitSwap failure', async () => {
			const submitError = new Error('Submit failed');
			(prepareSwapRequest as jest.Mock).mockResolvedValue('unsignedTx');
			(signSwapTransaction as jest.Mock).mockResolvedValue('signedTx');
			(grpcApi.submitSwap as jest.Mock).mockRejectedValue(submitError);

			await executeTrade(mockTradeDetails, mockFromCoin, mockToCoin, mockSlippage, mockSetIsLoadingTrade, mockSetIsConfirmationVisible, mockSetPollingStatus, mockSetSubmittedTxHash, mockSetPollingError, mockSetPollingConfirmations, mockSetIsStatusModalVisible, mockStartPollingFn, mockShowToast);

			expect(mockSetIsLoadingTrade).toHaveBeenCalledWith(false);
			expect(mockShowToast).toHaveBeenCalledWith('Trade execution failed: Submit failed', 'error');
			expect(mockSetIsConfirmationVisible).toHaveBeenCalledWith(false);
			expect(logger.exception).toHaveBeenCalledWith(submitError, expect.any(String), expect.any(Object));
		});
	});
});
