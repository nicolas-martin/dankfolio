import { Coin, Wallet, Base58PrivateKey } from '@/types';
import { PortfolioToken } from '@/store/portfolio';

export const mockFromCoin: Coin = {
	mintAddress: "So11111111111111111111111111111111111111112",
	name: "Solana",
	symbol: "SOL",
	iconUrl: "sol_icon_url",
	decimals: 9,
	price: 150.0,
	description: "Solana Blockchain",
	website: "https://solana.com",
	twitter: "https://twitter.com/solana",
	telegram: "",
	dailyVolume: 5e9,
	tags: ["layer-1"],
	createdAt: new Date("2024-01-01T00:00:00Z"),
};

export const mockToCoin: Coin = {
	mintAddress: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzL7xiH5HwMJI",
	name: "WEN",
	symbol: "WEN",
	iconUrl: "wen_icon_url",
	decimals: 5,
	price: 0.00011,
	description: "WEN",
	website: "https://wen-foundation.org",
	twitter: "https://twitter.com/wenwencoin",
	telegram: "https://t.me/wenwencoinsol",
	dailyVolume: 123456.78,
	tags: ["meme", "community"],
	createdAt: new Date("2024-01-01T00:00:00Z")
};

export const mockWallet: Wallet = {
	address: 'TestWalletAddress12345',
	privateKey: 'TestPrivateKey12345' as Base58PrivateKey,
	mnemonic: 'test mnemonic phrase for wallet',
};

export const mockFromPortfolioToken: PortfolioToken = {
	mintAddress: mockFromCoin.mintAddress,
	amount: 10,
	price: mockFromCoin.price,
	value: 10 * mockFromCoin.price,
	coin: mockFromCoin,
}; 
