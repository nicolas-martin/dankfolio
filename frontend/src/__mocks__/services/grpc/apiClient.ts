// Mock for @/services/grpc/apiClient
import { create } from "@bufbuild/protobuf";
import { GenerateTokenResponseSchema } from "@/gen/dankfolio/v1/auth_pb";

// Create a proper protobuf message mock
const createMockGenerateTokenResponse = (token: string, expiresIn: number) => {
  return create(GenerateTokenResponseSchema, {
    token,
    expiresIn,
  });
};

export const walletClient = {
  createWallet: jest.fn(),
  getWallet: jest.fn(),
  getBalance: jest.fn(),
};

export const tradeClient = {
  submitSwap: jest.fn(),
  getSwapStatus: jest.fn(),
  getSwapQuote: jest.fn(),
};

export const coinClient = {
  getAvailableCoins: jest.fn(),
  getCoinByID: jest.fn(),
};

export const authClient = {
  generateToken: jest.fn().mockImplementation(async () => {
    return createMockGenerateTokenResponse('mock-token', 3600);
  }),
};

export const priceClient = {
  getPriceHistory: jest.fn(),
  getTokenPrices: jest.fn(),
};

export const utilityClient = {
  prepareTokenTransfer: jest.fn(),
  submitTokenTransfer: jest.fn(),
}; 