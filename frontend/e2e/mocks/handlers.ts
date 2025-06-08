// frontend/e2e/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

// API_BASE_URL based on user feedback for local environment
const API_BASE_URL = 'http://localhost:9000';

// --- Previously defined mock data and handlers ---
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
    jupiterListedAt: new Date('2020-03-23T00:00:00Z').toISOString(),
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
    jupiterListedAt: new Date('2020-09-29T00:00:00Z').toISOString(),
    coingeckoId: 'usd-coin',
  },
];

const existingHandlers = [
  // Handler for WalletService -> GetWalletBalances
  http.post(`${API_BASE_URL}/dankfolio.v1.WalletService/GetWalletBalances`, async () => {
    console.log('[MSW] Intercepted WalletService/GetWalletBalances');
    return HttpResponse.json({
      balances: [
        { id: 'So11111111111111111111111111111111111111112', amount: 10.5 },
        { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZPKt', amount: 500.75 },
      ],
    });
  }),
  // Handler for CoinService -> GetAvailableCoins
  http.post(`${API_BASE_URL}/dankfolio.v1.CoinService/GetAvailableCoins`, async () => {
    console.log('[MSW] Intercepted CoinService/GetAvailableCoins');
    return HttpResponse.json(mockCoins);
  }),
  // Handler for CoinService -> GetCoinByID
  http.post(`${API_BASE_URL}/dankfolio.v1.CoinService/GetCoinByID`, async () => {
    console.log('[MSW] Intercepted CoinService/GetCoinByID');
    return HttpResponse.json(mockCoins[0]); // Return Solana by default
  }),
  http.get('https://api.coingecko.com/api/v3/ping', () => { // Keep if still relevant
    console.log('[MSW] Intercepted CoinGecko Ping');
    return HttpResponse.json({ gecko_says: '(V3) To the Moon!' });
  }),
];

// --- New Handlers ---
const newHandlers = [
  // 1. TradeService/SubmitSwap
  http.post(`${API_BASE_URL}/dankfolio.v1.TradeService/SubmitSwap`, async () => {
    console.log('[MSW] Intercepted TradeService/SubmitSwap');
    return HttpResponse.json({
      transactionHash: `mock_tx_hash_${Date.now()}`,
      tradeId: `mock_trade_id_${Date.now()}`, // Assuming SubmitSwapResponse has tradeId
    });
  }),

  // 2. TradeService/GetTrade (for getSwapStatus)
  // This mock should return a gRPC `Trade` message structure.
  // grpcApi.getSwapStatus then maps this to a TradeStatusResponse.
  http.post(`${API_BASE_URL}/dankfolio.v1.TradeService/GetTrade`, async () => {
    console.log('[MSW] Intercepted TradeService/GetTrade (for getSwapStatus)');
    return HttpResponse.json({
      id: `mock_trade_id_gettrade_${Date.now()}`,
      transactionHash: `mock_tx_hash_gettrade_${Date.now()}`,
      status: 'COMPLETED', // Example: 'STATUS_COMPLETED' or 'COMPLETED' if matching enum string
      confirmations: 10,
      finalized: true,
      error: '',
      fromCoinId: mockCoins[0].mintAddress,
      toCoinId: mockCoins[1].mintAddress,
      amount: "10", // Amount of fromCoin
      type: 'SWAP', // Example: 'TYPE_SWAP' or 'SWAP'
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
    });
  }),

  // 4. TradeService/GetSwapQuote
  http.post(`${API_BASE_URL}/dankfolio.v1.TradeService/GetSwapQuote`, async () => {
    console.log('[MSW] Intercepted TradeService/GetSwapQuote');
    return HttpResponse.json({
      // Fields should match SwapQuoteResponse in grpcApi.ts
      estimatedAmountOut: '150.5', // Corrected field name from estimatedAmount
      exchangeRate: '15.05',
      fee: '0.1',
      priceImpact: '0.01',
      routePlan: [{ fromCoinSymbol: 'SOL', toCoinSymbol: 'USDC', protocolName: 'MockSwapProtocol' }], // Adjusted for clarity
      inputMint: mockCoins[0].mintAddress,
      outputMint: mockCoins[1].mintAddress,
      // Other fields from proto if necessary: minimumAmountOut, slippageBps etc.
    });
  }),

  // 5. PriceService/GetPriceHistory
  http.post(`${API_BASE_URL}/dankfolio.v1.PriceService/GetPriceHistory`, async () => {
    console.log('[MSW] Intercepted PriceService/GetPriceHistory');
    const items = [];
    const now = Math.floor(Date.now() / 1000);
    for (let i = 0; i < 20; i++) {
      items.push({
        time: now - (20 - i) * 3600, // field name is 'time' in PriceDataPoint
        value: 100 + Math.random() * 50 - 25,
      });
    }
    return HttpResponse.json({ // Matches PriceHistoryResponse in grpcApi.ts
      prices: items,
    });
  }),

  // 8. PriceService/GetCoinPrices
  http.post(`${API_BASE_URL}/dankfolio.v1.PriceService/GetCoinPrices`, async () => {
    console.log('[MSW] Intercepted PriceService/GetCoinPrices');
    // Returns map[string]float64, matching CoinPricesResponse in grpcApi.ts
    return HttpResponse.json({
      [mockCoins[0].mintAddress]: mockCoins[0].price,
      [mockCoins[1].mintAddress]: mockCoins[1].price,
    });
  }),

  // 9. WalletService/PrepareTransfer (for prepareCoinTransfer)
  http.post(`${API_BASE_URL}/dankfolio.v1.WalletService/PrepareTransfer`, async () => {
    console.log('[MSW] Intercepted WalletService/PrepareTransfer');
    return HttpResponse.json({ // Matches PrepareTransferResponse in grpcApi.ts
      unsignedTransaction: `mock_unsigned_tx_${Date.now()}`,
    });
  }),

  // 10. WalletService/SubmitTransfer (for submitCoinTransfer)
  http.post(`${API_BASE_URL}/dankfolio.v1.WalletService/SubmitTransfer`, async () => {
    console.log('[MSW] Intercepted WalletService/SubmitTransfer');
    return HttpResponse.json({ // Matches SubmitTransferResponse in grpcApi.ts
      transactionHash: `mock_transfer_tx_hash_${Date.now()}`,
    });
  }),

  // 11. CoinService/Search
  http.post(`${API_BASE_URL}/dankfolio.v1.CoinService/Search`, async () => {
    console.log('[MSW] Intercepted CoinService/Search');
    // Returns Coin[] (FrontendCoin[]), matching mapListCoins in grpcApi.ts
    return HttpResponse.json([mockCoins[0]]); // Example: return SOL for any search
  }),

  // 12. CoinService/SearchCoinByMint
  http.post(`${API_BASE_URL}/dankfolio.v1.CoinService/SearchCoinByMint`, async () => {
    console.log('[MSW] Intercepted CoinService/SearchCoinByMint');
    // Returns Coin (FrontendCoin), matching mapCoin in grpcApi.ts
    return HttpResponse.json(mockCoins[1]); // Example: return USDC
  }),

  // 13. WalletService/CreateWallet
  http.post(`${API_BASE_URL}/dankfolio.v1.WalletService/CreateWallet`, async () => {
    console.log('[MSW] Intercepted WalletService/CreateWallet');
    return HttpResponse.json({ // Matches CreateWalletResponse in grpcApi.ts
      publicKey: `mock_pubkey_${Date.now()}`,
      mnemonic: 'mock twelve words for a fake wallet creation just for testing purposes',
      // secretKey is typically not returned or needed by frontend from this call
    });
  }),

  // 14. UtilityService/GetProxiedImage
  http.post(`${API_BASE_URL}/dankfolio.v1.UtilityService/GetProxiedImage`, async () => {
    console.log('[MSW] Intercepted UtilityService/GetProxiedImage');
    // Return a small, valid base64 encoded image (e.g., a 1x1 pixel transparent PNG)
    const base64Pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    return HttpResponse.json({ // Matches GetProxiedImageResponse in grpcApi.ts
      base64Image: base64Pixel, // Send the full data URI or just base64 part depending on what frontend expects
    });
  }),

  // 15. TradeService/PrepareSwap
  http.post(`${API_BASE_URL}/dankfolio.v1.TradeService/PrepareSwap`, async () => {
    console.log('[MSW] Intercepted TradeService/PrepareSwap');
    return HttpResponse.json({ // Matches PrepareSwapResponse in grpcApi.ts
      unsignedTransaction: `mock_prepare_swap_unsigned_tx_${Date.now()}`,
    });
  }),

  // 16. TradeService/ListTrades
  // This mock should return a list of gRPC `Trade` message structures.
  // grpcApi.listTrades then maps these to Transaction[].
  http.post(`${API_BASE_URL}/dankfolio.v1.TradeService/ListTrades`, async () => {
    console.log('[MSW] Intercepted TradeService/ListTrades');
    const mockGrpcTrade = {
      id: `trade_${Date.now()}`,
      type: 'SWAP',
      fromCoinId: mockCoins[0].mintAddress,
      toCoinId: mockCoins[1].mintAddress,
      amount: '10',
      status: 'COMPLETED',
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanos: 0 },
      transactionHash: `tx_${Date.now()}`,
      confirmations: 10,
      finalized: true,
      error: '',
      // Fields used by mapGrpcTradeToFrontendTransaction in grpcApi.ts
      fromCoinSymbol: mockCoins[0].symbol,
      toCoinSymbol: mockCoins[1].symbol,
      fromCoinImageUrl: mockCoins[0].imageUrl,
      toCoinImageUrl: mockCoins[1].imageUrl,
      fromCoinDecimals: mockCoins[0].decimals,
      toCoinDecimals: mockCoins[1].decimals,
      amountTo: "1500.0" // Example amountTo
    };
    return HttpResponse.json({ // Matches ListTradesResponse in grpcApi.ts
      trades: [mockGrpcTrade],
      totalCount: 1,
    });
  }),
];

export const handlers = [...existingHandlers, ...newHandlers];
