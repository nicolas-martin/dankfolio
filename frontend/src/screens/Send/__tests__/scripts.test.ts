import { validateForm } from '../scripts';
import { validateSolanaAddress } from '@/services/solana';
import { TokenTransferFormData } from '../types';
import { PortfolioToken } from '@store/portfolio';
import { Coin } from '@/types'; // Assuming Coin might be needed for PortfolioToken

// Mock dependencies
// jest.mock('axios'); // No longer using axios
jest.mock('@/services/solana', () => ({
	validateSolanaAddress: jest.fn(),
}));

// Mock logger to prevent console errors during tests for expected error logging
jest.mock('@/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
        breadcrumb: jest.fn(),
        exception: jest.fn(),
    },
}));

// const mockedAxios = axios as jest.Mocked<typeof axios>; // No longer using axios
const mockedValidateSolanaAddress = validateSolanaAddress as jest.Mock;

// Mock global fetch
global.fetch = jest.fn();

describe('validateForm', () => {
	let mockFormData: TokenTransferFormData;
	let mockSelectedToken: PortfolioToken;

	beforeEach(() => {
		// Reset mocks before each test
		mockedValidateSolanaAddress.mockReset();
		(global.fetch as jest.Mock).mockClear(); // Clear fetch mocks

		// Initialize with valid default form data
		mockFormData = {
			toAddress: 'validSolanaAddress',
			amount: '10',
			selectedTokenMint: 'solanaMintAddress',
		};
		// Initialize with a valid selected token
		mockSelectedToken = {
			mintAddress: 'solanaMintAddress',
			amount: 100, // User has 100 tokens
			price: 100,
			value: 10000,
			coin: { // Basic coin object
				mintAddress: 'solanaMintAddress',
				name: 'Solana',
				symbol: 'SOL',
				resolvedIconUrl: 'solana_logo_uri',
				coingeckoId: 'solana',
				decimals: 9,
				description: 'Solana blockchain',
				tags: ['layer-1'],
				price: 100,
				dailyVolume: 1000000,
			}
		};
	});

	// Scenario 1: Valid address, exists on Solscan
	test('should return ADDRESS_EXISTS_ON_SOLSCAN if address is valid and found on Solscan', async () => {
		mockedValidateSolanaAddress.mockResolvedValue(true);
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: true,
			status: 200,
			// json: async () => ({}), // Not strictly needed as we don't parse json in this path
		});

		const result = await validateForm(mockFormData, mockSelectedToken);
		expect(result).toEqual({
			isValid: true,
			code: 'ADDRESS_EXISTS_ON_SOLSCAN',
			message: 'Address found on Solscan. Please verify this is the correct address before proceeding.',
		});
		expect(mockedValidateSolanaAddress).toHaveBeenCalledWith('validSolanaAddress');
		expect(global.fetch).toHaveBeenCalledWith('https://public-api.solscan.io/account/validSolanaAddress');
	});

	// Scenario 2: Valid address, does not exist on Solscan (404)
	test('should return error if address is valid but not found on Solscan (404)', async () => {
		mockedValidateSolanaAddress.mockResolvedValue(true);
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
			status: 404,
		});

		const result = await validateForm(mockFormData, mockSelectedToken);
		expect(result).toEqual({
			isValid: false,
			message: 'Invalid Solana address or address not found on Solscan',
		});
	});

	// Scenario 3: Solscan API error (e.g., 500 server error)
	test('should return error if Solscan API returns a server error (e.g., 500)', async () => {
		mockedValidateSolanaAddress.mockResolvedValue(true);
		(global.fetch as jest.Mock).mockResolvedValueOnce({
			ok: false,
			status: 500,
			statusText: 'Internal Server Error',
		});

		const result = await validateForm(mockFormData, mockSelectedToken);
		expect(result).toEqual({
			isValid: false,
			message: 'Error verifying address with Solscan. Please try again.',
		});
	});

	// Scenario 4: Network error during fetch
	test('should return error if fetch call fails due to network error', async () => {
		mockedValidateSolanaAddress.mockResolvedValue(true);
		(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

		const result = await validateForm(mockFormData, mockSelectedToken);
		expect(result).toEqual({
			isValid: false,
			message: 'Error verifying address with Solscan. Please try again.',
		});
	});

	// Scenario (adjusted): Invalid Solana address (client-side validation)
	test('should return error for invalid Solana address format (client-side)', async () => {
		mockedValidateSolanaAddress.mockResolvedValue(false); // Simulate invalid address format

		const result = await validateForm(mockFormData, mockSelectedToken);
		expect(result).toEqual({
			isValid: false,
			message: 'Invalid Solana address',
		});
		// fetch should not be called if address format is invalid
		expect(global.fetch).not.toHaveBeenCalled();
	});

	// Scenario: Existing validations - Missing recipient address
	test('should return error if recipient address is missing', async () => {
		mockFormData.toAddress = '';
		const result = await validateForm(mockFormData, mockSelectedToken);
		expect(result).toEqual({
			isValid: false,
			message: 'Recipient address is required',
		});
		expect(mockedValidateSolanaAddress).not.toHaveBeenCalled();
		expect(global.fetch).not.toHaveBeenCalled();
	});

	// Scenario: Existing validations - Invalid amount (<=0)
	test('should return error for invalid amount (zero)', async () => {
		mockedValidateSolanaAddress.mockResolvedValue(true); // Address validation should pass
		mockFormData.amount = '0';
		const result = await validateForm(mockFormData, mockSelectedToken);
		expect(result).toEqual({
			isValid: false,
			message: 'Please enter a valid amount',
		});
		// This check is after address validation, so address validation would have been called
		// but fetch for solscan should not be
		expect(global.fetch).not.toHaveBeenCalled();
	});

	test('should return error for invalid amount (negative)', async () => {
		mockedValidateSolanaAddress.mockResolvedValue(true); // Address validation should pass
		mockFormData.amount = '-1';
		const result = await validateForm(mockFormData, mockSelectedToken);
		expect(result).toEqual({
			isValid: false,
			message: 'Please enter a valid amount',
		});
		expect(global.fetch).not.toHaveBeenCalled();
	});

	// Scenario: Existing validations - Missing token selection
	test('should return error if no token is selected', async () => {
		mockedValidateSolanaAddress.mockResolvedValue(true); // Address validation should pass
		mockFormData.selectedTokenMint = '';
		const result = await validateForm(mockFormData, mockSelectedToken);
		expect(result).toEqual({
			isValid: false,
			message: 'Please select a token',
		});
		expect(global.fetch).not.toHaveBeenCalled();
	});

	// Scenario: Existing validations - Insufficient balance
	test('should return error for insufficient balance', async () => {
		mockedValidateSolanaAddress.mockResolvedValue(true); // Address is valid
		// User has 100 tokens, trying to send 101
		mockFormData.amount = '101';
		// mockSelectedToken already has amount: 100

		const result = await validateForm(mockFormData, mockSelectedToken);
		// This check happens before Solscan, if address is valid
		expect(result).toEqual({
			isValid: false,
			message: `Insufficient balance. Maximum available: ${mockSelectedToken.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 6})} ${mockSelectedToken.coin.symbol}`,
		});
		// Solscan (fetch) should not be called if balance is insufficient after address check
		expect(global.fetch).not.toHaveBeenCalled();
	});

	// Test case where all initial checks pass and Solscan is called
	test('should proceed to Solscan (fetch) check if initial validations pass', async () => {
		mockedValidateSolanaAddress.mockResolvedValue(true);
		(global.fetch as jest.Mock).mockResolvedValueOnce({ // Solscan says OK
			ok: true,
			status: 200,
		});

		await validateForm(mockFormData, mockSelectedToken);

		expect(mockedValidateSolanaAddress).toHaveBeenCalledWith(mockFormData.toAddress);
		expect(global.fetch).toHaveBeenCalledWith(`https://public-api.solscan.io/account/${mockFormData.toAddress}`);
	});

});
