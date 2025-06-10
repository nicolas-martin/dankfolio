import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { CoinSchema, type Coin as ProtobufCoin } from '@/gen/dankfolio/v1/coin_pb';
import type { Balance } from '@/gen/dankfolio/v1/wallet_pb';
import { BalanceSchema } from '@/gen/dankfolio/v1/wallet_pb';

// Mock trending coins (complete data)
export const MOCK_TRENDING_COINS: ProtobufCoin[] = [
	create(CoinSchema, {
		mintAddress: 'DankCoin1111111111111111111111111111111',
		name: 'DankCoin',
		symbol: 'DANK',
		decimals: 9,
		description: 'The dankest meme coin on Solana',
		iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		resolvedIconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		tags: ['meme', 'community'],
		price: 0.000042,
		dailyVolume: 1250000,
		website: 'https://dankcoin.meme',
		twitter: 'https://twitter.com/dankcoin',
		coingeckoId: 'dank-coin',
		createdAt: timestampFromDate(new Date('2024-01-15')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: true,
		jupiterListedAt: timestampFromDate(new Date('2024-01-20')),
	}),
	create(CoinSchema, {
		mintAddress: 'MoonToken111111111111111111111111111111',
		name: 'Moon Token',
		symbol: 'MOON',
		decimals: 6,
		description: 'To the moon and beyond! 🚀',
		iconUrl: 'https://arweave.net/KSXBz7Rp8OX_5_8cqz8JVqNuDVhOqJD7qJQJ5QJ5QJ5',
		resolvedIconUrl: 'https://arweave.net/KSXBz7Rp8OX_5_8cqz8JVqNuDVhOqJD7qJQJ5QJ5QJ5',
		tags: ['meme', 'moon'],
		price: 0.00123,
		dailyVolume: 890000,
		website: 'https://moontoken.space',
		twitter: 'https://twitter.com/moontoken',
		coingeckoId: 'moon-token',
		createdAt: timestampFromDate(new Date('2024-02-01')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: true,
		jupiterListedAt: timestampFromDate(new Date('2024-02-05')),
	}),
	create(CoinSchema, {
		mintAddress: 'Bonk111111111111111111111111111111111111',
		name: 'Bonk',
		symbol: 'BONK',
		decimals: 5,
		description: 'The first Solana dog coin for the people, by the people',
		iconUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
		resolvedIconUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
		tags: ['meme', 'dog', 'community'],
		price: 0.0000089,
		dailyVolume: 2100000,
		website: 'https://bonkcoin.com',
		twitter: 'https://twitter.com/bonk_inu',
		coingeckoId: 'bonk',
		createdAt: timestampFromDate(new Date('2022-12-25')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2023-01-01')),
	}),
	create(CoinSchema, {
		mintAddress: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
		name: 'Jupiter',
		symbol: 'JUP',
		decimals: 6,
		description: 'The key infrastructure for Solana trading',
		iconUrl: 'https://static.jup.ag/jup/icon.png',
		resolvedIconUrl: 'https://static.jup.ag/jup/icon.png',
		tags: ['defi', 'infrastructure'],
		price: 0.87,
		dailyVolume: 15600000,
		website: 'https://jup.ag',
		twitter: 'https://twitter.com/JupiterExchange',
		coingeckoId: 'jupiter-exchange-solana',
		createdAt: timestampFromDate(new Date('2023-10-19')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2023-10-19')),
	}),
	create(CoinSchema, {
		mintAddress: 'So11111111111111111111111111111111111111112',
		name: 'Wrapped SOL',
		symbol: 'SOL',
		decimals: 9,
		description: 'Wrapped Solana',
		iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		resolvedIconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		tags: ['native'],
		price: 98.45,
		dailyVolume: 45000000,
		website: 'https://solana.com',
		twitter: 'https://twitter.com/solana',
		coingeckoId: 'solana',
		createdAt: timestampFromDate(new Date('2020-03-16')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2021-09-09')),
	}),
	create(CoinSchema, {
		mintAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
		name: 'USD Coin',
		symbol: 'USDC',
		decimals: 6,
		description: 'USD Coin',
		iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
		resolvedIconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
		tags: ['stablecoin'],
		price: 1.0,
		dailyVolume: 125000000,
		website: 'https://centre.io',
		twitter: 'https://twitter.com/centre_io',
		coingeckoId: 'usd-coin',
		createdAt: timestampFromDate(new Date('2018-09-26')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2021-09-09')),
	}),
];

// Mock new coins (less complete data, sorted by jupiter_listed_at desc)
export const MOCK_NEW_COINS: ProtobufCoin[] = [
	create(CoinSchema, {
		mintAddress: 'NewCoin1111111111111111111111111111111',
		name: 'Fresh Meme',
		symbol: 'FRESH',
		decimals: 9,
		description: 'Brand new meme coin just listed',
		iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		resolvedIconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		tags: ['meme', 'new'],
		price: 0.0000001,
		dailyVolume: 50000,
		website: '', // Missing data for new coins
		twitter: '', // Missing data for new coins
		coingeckoId: '', // Missing data for new coins
		createdAt: timestampFromDate(new Date('2024-12-01')), // Very recent
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2024-12-01')), // Most recent listing
	}),
	create(CoinSchema, {
		mintAddress: 'RocketCoin111111111111111111111111111',
		name: 'Rocket Launch',
		symbol: 'ROCKET',
		decimals: 6,
		description: 'New rocket-themed token',
		iconUrl: 'https://static.jup.ag/jup/icon.png',
		resolvedIconUrl: 'https://static.jup.ag/jup/icon.png',
		tags: ['meme', 'space'],
		price: 0.000005,
		dailyVolume: 125000,
		website: '', // Missing data for new coins
		twitter: 'https://twitter.com/rocketcoin', // Partial data
		coingeckoId: '', // Missing data for new coins
		createdAt: timestampFromDate(new Date('2024-11-28')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2024-11-28')), // Second most recent
	}),
	create(CoinSchema, {
		mintAddress: 'DiamondCoin11111111111111111111111111',
		name: 'Diamond Hands',
		symbol: 'DIAMOND',
		decimals: 8,
		description: 'For true diamond hands only',
		iconUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
		resolvedIconUrl: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
		tags: ['meme', 'diamond'],
		price: 0.000012,
		dailyVolume: 75000,
		website: 'https://diamondcoin.gem', // Some data available
		twitter: '', // Missing data for new coins
		coingeckoId: '', // Missing data for new coins
		createdAt: timestampFromDate(new Date('2024-11-25')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2024-11-25')), // Third most recent
	}),
];

// All coins combined for general searches
export const ALL_MOCK_COINS = [...MOCK_TRENDING_COINS, ...MOCK_NEW_COINS];

// Mock wallet balances using exact gRPC types
export const MOCK_WALLET_BALANCES: Balance[] = [
	create(BalanceSchema, { id: 'So11111111111111111111111111111111111111112', amount: 2.5 }), // SOL
	create(BalanceSchema, { id: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', amount: 1000.0 }), // USDC
	create(BalanceSchema, { id: 'DankCoin1111111111111111111111111111111', amount: 5000000.0 }), // DANK
	create(BalanceSchema, { id: 'MoonToken111111111111111111111111111111', amount: 250000.0 }), // MOON
	create(BalanceSchema, { id: 'Bonk111111111111111111111111111111111111', amount: 10000000.0 }), // BONK
	create(BalanceSchema, { id: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', amount: 150.0 }), // JUP
];
