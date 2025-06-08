// frontend/e2e/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

// Assumed base URL for the gRPC-Web calls
const API_BASE_URL = 'https://api.dankfolio.com'; // IMPORTANT: Adjust if different!

// Mock data structures should align with what the frontend expects after gRPC mapping.
// These are simplified examples. Refer to frontend/src/types/index.ts or store types.

const mockCoins = [
  {
    mintAddress: 'So11111111111111111111111111111111111111112', // SOL
    name: 'Solana',
    symbol: 'SOL',
    imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    price: 150.0,
    decimals: 9,
    dailyVolume: 1000000,
    marketCap: 70000000000,
    description: 'Solana is a fast, secure, and censorship resistant blockchain.',
    tags: ['platform', 'native'],
    jupiterListedAt: '2020-03-23T00:00:00Z', // Example date
    coingeckoId: 'solana',
  },
  {
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZPKt', // USDC
    name: 'USD Coin',
    symbol: 'USDC',
    imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZPKt/logo.png',
    price: 1.0,
    decimals: 6,
    dailyVolume: 500000000,
    marketCap: 25000000000,
    description: 'USD Coin (USDC) is a stablecoin redeemable on a 1:1 basis for US dollars.',
    tags: ['stablecoin', 'usd'],
    jupiterListedAt: '2020-09-29T00:00:00Z',
    coingeckoId: 'usd-coin',
  },
];

export const handlers = [
  // Handler for WalletService -> GetWalletBalances
  // Matches: POST {API_BASE_URL}/dankfolio.v1.WalletService/GetWalletBalances
  http.post(`${API_BASE_URL}/dankfolio.v1.WalletService/GetWalletBalances`, async ({ request }) => {
    // const reqBody = await request.json(); // gRPC-Web request body is binary, but msw might parse it if Content-Type is application/json
    // For gRPC-Web with Protobuf, the request body is binary.
    // We might not need to inspect the body for this generic mock.
    // We'd respond with what the app expects after processing the gRPC response.
    console.log('[MSW] Intercepted GetWalletBalances');
    return HttpResponse.json({
      // This structure should match `grpcModel.WalletBalanceResponse` as transformed by `grpcApi.ts`
      balances: [
        { id: 'So11111111111111111111111111111111111111112', amount: 10.5 }, // 10.5 SOL
        { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZPKt', amount: 500.75 }, // 500.75 USDC
      ],
    });
  }),

  // Handler for CoinService -> GetAvailableCoins
  // Matches: POST {API_BASE_URL}/dankfolio.v1.CoinService/GetAvailableCoins
  http.post(`${API_BASE_URL}/dankfolio.v1.CoinService/GetAvailableCoins`, async ({ request }) => {
    // const reqBody = await request.json();
    // const trendingOnly = reqBody?.trendingOnly; // Example if we need to check request params
    console.log('[MSW] Intercepted GetAvailableCoins');
    return HttpResponse.json(
      // This structure should match `grpcModel.Coin[]` (FrontendCoin[]) as returned by `mapListCoins` in `grpcApi.ts`
      // The actual gRPC response from the service is { coins: GrpcCoin[] }
      // but the client-side mapping in grpcApi.ts->mapListCoins already extracts the array.
      mockCoins
    );
  }),

  // Handler for CoinService -> GetCoinByID
  // Matches: POST {API_BASE_URL}/dankfolio.v1.CoinService/GetCoinByID
  http.post(`${API_BASE_URL}/dankfolio.v1.CoinService/GetCoinByID`, async ({ request }) => {
    // For gRPC, the request body is binary. To get the mintAddress, proper deserialization
    // would be needed. For a simple mock, we can return a default coin or try to match.
    // This is a simplified approach.
    console.log('[MSW] Intercepted GetCoinByID');
    // This example just returns SOL if any GetCoinByID is called.
    // A more sophisticated mock might try to parse the request or have specific handlers per ID.
    return HttpResponse.json(mockCoins[0]); // Return Solana by default
  }),

  // Fallback for CoinGecko ping if it's still there from example
  http.get('https://api.coingecko.com/api/v3/ping', () => {
    console.log('[MSW] Intercepted CoinGecko Ping');
    return HttpResponse.json({ gecko_says: '(V3) To the Moon!' });
  }),
];

// Helper to log unhandled requests if needed for debugging
// server.events.on('request:unhandled', (req) => {
//   console.warn(`[MSW] Unhandled ${req.method} request to ${req.url.href}`);
// });
