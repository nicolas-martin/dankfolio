import { grpcApi } from '@/services/grpcApi';
import { tradeClient } from '@/services/grpc/apiClient';
import * as grpcUtils from '@/services/grpc/grpcUtils';
import { TradeSchema, ListTradesResponseSchema } from '@/gen/dankfolio/v1/trade_pb';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { create } from '@bufbuild/protobuf';

// Mock the tradeClient
jest.mock('@/services/grpc/apiClient', () => ({
	...jest.requireActual('@/services/grpc/apiClient'), // Import and retain other client exports
	tradeClient: {
		listTrades: jest.fn(),
	},
}));

// Mock grpcUtils to spy on handleGrpcError and prevent logging during tests
jest.mock('@/services/grpc/grpcUtils', () => ({
	...jest.requireActual('@/services/grpc/grpcUtils'),
	handleGrpcError: jest.fn((error, serviceName, methodName) => {
		// In a real test, you might want to throw a specific error or return a value
		// For now, we'll just return the error to avoid throwing
		return error;
	}),
	logRequest: jest.fn(),
	logResponse: jest.fn(),
	getRequestHeaders: jest.fn().mockReturnValue({}),
}));

describe('grpcApi.listTrades', () => {
	const mockUserId = 'test-user-123';

	beforeEach(() => {
		// Clear mock call history before each test
		(tradeClient.listTrades as jest.Mock).mockClear();
		(grpcUtils.handleGrpcError as unknown as jest.Mock).mockClear();
	});

	it('should call tradeClient.listTrades with correct default parameters', async () => {
		(tradeClient.listTrades as jest.Mock).mockResolvedValueOnce(
			create(ListTradesResponseSchema, { trades: [], totalCount: 0 })
		);

		await grpcApi.listTrades({ userId: mockUserId });

		expect(tradeClient.listTrades).toHaveBeenCalledWith(
			{
				userId: mockUserId,
				limit: 10, // default
				offset: 0, // default
				sortBy: 'created_at', // default
				sortDesc: true, // default
			},
			{ headers: expect.any(Object) }
		);
	});

	it('should call tradeClient.listTrades with provided parameters', async () => {
		(tradeClient.listTrades as jest.Mock).mockResolvedValueOnce(
			create(ListTradesResponseSchema, { trades: [], totalCount: 0 })
		);

		const params = {
			userId: mockUserId,
			limit: 20,
			offset: 5,
			sortBy: 'amount',
			sortDesc: false,
		};
		await grpcApi.listTrades(params);

		expect(tradeClient.listTrades).toHaveBeenCalledWith(
			{
				userId: mockUserId,
				limit: 20,
				offset: 5,
				sortBy: 'amount',
				sortDesc: false,
			},
			{ headers: expect.any(Object) }
		);
	});

	it('should map gRPC response to frontend Transaction structure', async () => {
		const mockDate = new Date();
		const mockTimestamp = timestampFromDate(mockDate);

		const mockGrpcTrades = [
			create(TradeSchema, {
				id: 'trade1',
				userId: mockUserId,
				fromCoinId: 'BTC',
				toCoinId: 'ETH',
				amount: 1.5,
				type: 'SWAP', // Using string instead of enum
				status: 'COMPLETED', // Using string instead of enum
				transactionHash: 'txHash123',
				createdAt: mockTimestamp,
			}),
		];
		(tradeClient.listTrades as jest.Mock).mockResolvedValueOnce(
			create(ListTradesResponseSchema, { trades: mockGrpcTrades, totalCount: 1 })
		);

		const result = await grpcApi.listTrades({ userId: mockUserId });

		expect(result.transactions).toHaveLength(1);
		expect(result.totalCount).toBe(1);
		expect(result.transactions[0]).toEqual({
			id: 'trade1',
			type: 'SWAP', // Raw enum value, as per current implementation
			fromCoinSymbol: 'BTC', // Placeholder
			toCoinSymbol: 'ETH', // Placeholder
			amount: 1.5, // Should be number, not string
			status: 'COMPLETED', // Raw enum value
			date: new Date(Number(mockTimestamp.seconds) * 1000).toISOString(),
			transactionHash: 'txHash123',
		});
	});

	it('should handle empty trades response', async () => {
		(tradeClient.listTrades as jest.Mock).mockResolvedValueOnce(
			create(ListTradesResponseSchema, { trades: [], totalCount: 0 })
		);
		const result = await grpcApi.listTrades({ userId: mockUserId });
		expect(result.transactions).toEqual([]);
		expect(result.totalCount).toBe(0);
	});

	it('should handle date conversion for trades without createdAt', async () => {
		const mockGrpcTrades = [
			create(TradeSchema, {
				id: 'trade2',
				// No createdAt timestamp
			}),
		];
		(tradeClient.listTrades as jest.Mock).mockResolvedValueOnce(
			create(ListTradesResponseSchema, { trades: mockGrpcTrades, totalCount: 1 })
		);

		const result = await grpcApi.listTrades({ userId: mockUserId });
		expect(result.transactions[0].date).toBe(""); // As per current implementation
	});

	it('should call grpcUtils.handleGrpcError on failure', async () => {
		const mockError = new Error('gRPC call failed');
		(tradeClient.listTrades as jest.Mock).mockRejectedValueOnce(mockError);

		await expect(grpcApi.listTrades({ userId: mockUserId })).rejects.toThrow('gRPC call failed');
		expect(grpcUtils.handleGrpcError).toHaveBeenCalledWith(mockError, 'TradeService', 'listTrades');
	});
});
