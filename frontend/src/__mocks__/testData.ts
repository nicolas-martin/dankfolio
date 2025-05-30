import { Coin, Wallet, RawWalletData, Base58PrivateKey } from '@/types';
import { PortfolioToken } from '@/store/portfolio';

export const mockSolCoin: Coin = {
	mintAddress: 'So11111111111111111111111111111111111111112',
	symbol: 'SOL',
	name: 'Solana',
	resolvedIconUrl: "sol_icon_url",
	decimals: 9,
	price: 100,
	change24h: 5.5,
	dailyVolume: 1000000,
	description: 'Solana blockchain',
	website: 'https://solana.com',
	twitter: 'https://twitter.com/solana',
	telegram: '',
	tags: ['layer-1'],
	createdAt: new Date(),
};

export const mockWenCoin: Coin = {
	mintAddress: 'WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk',
	symbol: 'WEN',
	name: 'Wen Token',
	resolvedIconUrl: "wen_icon_url",
	decimals: 5,
	price: 0.001,
	change24h: -2.3,
	dailyVolume: 500000,
	description: 'Wen token',
	website: 'https://wen.com',
	twitter: 'https://twitter.com/wen',
	telegram: '',
	tags: ['meme'],
	createdAt: new Date(),
};

export const mockWallet: RawWalletData = {
	address: 'TestWalletAddress12345',
	privateKey: 'TestPrivateKey12345' as Base58PrivateKey,
	mnemonic: 'test mnemonic phrase for wallet',
};

export const mockFromPortfolioToken: PortfolioToken = {
	mintAddress: mockSolCoin.mintAddress,
	amount: 10,
	price: mockSolCoin.price,
	value: 10 * mockSolCoin.price,
	coin: mockSolCoin,
}; 
