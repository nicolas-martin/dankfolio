// frontend/e2e/mocks/mockData.ts

// Based on the Coin type used in the original tests and MSW handlers
export interface MockCoin {
  mintAddress: string;
  symbol: string;
  name: string;
  resolvedIconUrl?: string; // Optional as it was in original Coin type, but imageUrl is in MSW
  imageUrl?: string; // From MSW mockCoins
  decimals: number;
  price: number;
  change24h?: number; // Optional as it was in original Coin type
  dailyVolume?: number;
  marketCap?: number; // From MSW mockCoins
  description?: string;
  website?: string; // Optional
  twitter?: string; // Optional
  telegram?: string; // Optional
  tags?: string[];   // Optional in original, present in MSW
  createdAt?: Date;  // Optional
  jupiterListedAt?: string; // From MSW mockCoins
  coingeckoId?: string; // From MSW mockCoins
}

// Using data similar to MSW handlers and original tests for consistency
export const mockCoins: MockCoin[] = [
  {
    mintAddress: 'So11111111111111111111111111111111111111112', // SOL
    name: 'Solana',
    symbol: 'SOL',
    imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    price: 150.0, // Price from MSW mock
    decimals: 9,
    dailyVolume: 1000000, // From MSW mock
    marketCap: 70000000000, // From MSW mock
    description: 'Solana is a fast, secure, and censorship resistant blockchain.', // From MSW mock
    tags: ['platform', 'native'], // From MSW mock
    jupiterListedAt: new Date('2020-03-23T00:00:00Z').toISOString(), // From MSW mock
    coingeckoId: 'solana', // From MSW mock
    // Fields from original mockCoin if needed and not covered by MSW structure:
    change24h: 5.5,
    website: 'https://solana.com',
    twitter: 'https://twitter.com/solana',
    createdAt: new Date(),
  },
  {
    mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZPKt', // USDC (as an example of a second coin)
    name: 'USD Coin',
    symbol: 'USDC',
    imageUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZPKt/logo.png',
    price: 1.0, // Price from MSW mock
    decimals: 6,
    dailyVolume: 500000000, // From MSW mock
    marketCap: 25000000000, // From MSW mock
    description: 'USD Coin (USDC) is a stablecoin redeemable on a 1:1 basis for US dollars.', // From MSW mock
    tags: ['stablecoin', 'usd'], // From MSW mock
    jupiterListedAt: new Date('2020-09-29T00:00:00Z').toISOString(), // From MSW mock
    coingeckoId: 'usd-coin', // From MSW mock
    // Fields from original mockCoin2 if needed:
    change24h: -2.3,
    website: 'https://test.com', // Example, original was generic
    twitter: 'https://twitter.com/test', // Example
    createdAt: new Date(),
  },
  // Add more mock coins if needed for other tests
];

// This should be the actual public key corresponding to the TEST_PRIVATE_KEY
// used for the debug wallet in the application.
// Placeholder value - replace with the actual address.
export const MOCK_WALLET_ADDRESS = 'YourDebugWalletPublicKeyHere_PleaseReplace';
