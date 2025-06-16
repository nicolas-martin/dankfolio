import { create } from '@bufbuild/protobuf';
import { timestampFromDate } from '@bufbuild/protobuf/wkt';
import { CoinSchema, type Coin as ProtobufCoin } from '@/gen/dankfolio/v1/coin_pb';
import type { Balance } from '@/gen/dankfolio/v1/wallet_pb';
import { BalanceSchema } from '@/gen/dankfolio/v1/wallet_pb';

// Real transaction data captured for testing send functionality
export const CAPTURED_TRANSACTION_DATA = {
	// Unsigned transaction from backend
	UNSIGNED_TX: 'AAEAAgXpAnf0tR1fLcZsinyAFilsbMA7lFi1Ko2WHOj22jSYAjOS3tvBbPB0zM/8tpNGoZXLjBt3JO3kNL+at5Hes+Z6dDw9sedycSDvhoJUJcfbMjdZ5TnBbqMW1HAaEDru0sWvJnvuaWRtBpVpBH3TC2UKEWEBXmy1D/bGmI9EXGBg3wbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCpVs0FngTVDZL7LGBPXEJEsvbTTl++uViGw77cK25FEb8BBAQBAwIACgxqAAAAAAAAAAY=',

	// Signed transaction after user signature
	SIGNED_TX: 'Adpu4Zemt8N39gj8FH3I6etlIgrOqUe24zbEHlIgKRzjRiwTlDp6k/zc/GA34kYi38fN0cvujIT5coyJcJxRTwQBAAIF6QJ39LUdXy3GbIp8gBYpbGzAO5RYtSqNlhzo9to0mAIzkt7bwWzwdMzP/LaTRqGVy4wbdyTt5DS/mreR3rPmenQ8PbHncnEg74aCVCXH2zI3WeU5wW6jFtRwGhA67tLFryZ77mlkbQaVaQR90wtlChFhAV5stQ/2xpiPRFxgYN8G3fbh12Whk9nL4UbO63msHLSF7V9bN5E6jPWFfv8AqVbNBZ4E1Q2S+yxgT1xCRLL2005fvrlYhsO+3CtuRRG/AQQEAQMCAAoMagAAAAAAAAAG',

	// Transaction details
	FROM_ADDRESS: 'GgaBFkzjuvMV7RCrZyt65zx7iRo7W6Af4cGXZMKNxK2R',
	TO_ADDRESS: '6hbS1d1JRRta3GtJC7XNo16gg3PTb41QJVzy6kWsZnav',
	TOKEN_MINT: 'CniPCE4b3s8gSUPhUiyMjXnytrEqUrMfSsnbBjLCpump',
	AMOUNT: 1.65973075,
	BLOCKHASH: '6qqPJJLFshxUcoXv4V5SepMGFTqvA5nDgXt8MdZQYpNS',

	// Test private key (for testing only - remove in production)
	TEST_PRIVATE_KEY: '2QmVGmjHSaScaVAvRRdT7cacmo2Rp2p8vB7dbYJhnvAdoy9GKeWrhmZE7JGVgD4wnPaGP65MzYvtvcE1QLH3ZLXj',

	// Mock transaction hash that would be returned after submission
	MOCK_TX_HASH: '5J8WfVhqKjKxjKjKxjKjKxjKjKxjKjKxjKjKxjKjKxjKjKxjKjKxjKjKxjKjKxjKjKxjKjKx',
};

// Mock trending coins (complete data)
export const MOCK_TRENDING_COINS: ProtobufCoin[] = [
	create(CoinSchema, {
		mintAddress: 'dankcoin1111111111111111111111111111111',
		name: 'DankCoin',
		symbol: 'DANK',
		decimals: 9,
		description: 'The dankest meme coin on Solana',
		iconUrl: 'https://static.wikia.nocookie.net/dank_memer/images/e/e6/Site-logo.png/revision',
		resolvedIconUrl: 'https://static.wikia.nocookie.net/dank_memer/images/e/e6/Site-logo.png',
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
		mintAddress: 'moontoken111111111111111111111111111111',
		name: 'Safe Moon',
		symbol: 'MOON',
		decimals: 6,
		description: 'To the moon and beyond! 🚀',
		iconUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/SafeMoon_Logo.svg/1920px-SafeMoon_Logo.svg.png',
		resolvedIconUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/SafeMoon_Logo.svg/1920px-SafeMoon_Logo.svg.png',
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
		mintAddress: 'bonk111111111111111111111111111111111111',
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
		mintAddress: 'jupyiwryjfskupiha7hker8vutaefosybkedznsdvcn',
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
		mintAddress: 'so11111111111111111111111111111111111111112',
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
		mintAddress: 'epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v',
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
		mintAddress: 'newcoin1111111111111111111111111111111',
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
		mintAddress: 'rocketcoin111111111111111111111111111',
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
		mintAddress: 'diamondcoin11111111111111111111111111',
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

// Mock top gainer coins
export const MOCK_TOP_GAINER_COINS: ProtobufCoin[] = [
	create(CoinSchema, {
		mintAddress: 'gainercoinAlpha111111111111111111111111',
		name: 'GainerCoin Alpha',
		symbol: 'GCA',
		decimals: 9,
		description: 'Alpha version of the top gainer coin, expected to skyrocket!',
		iconUrl: 'https://example.com/gainer_alpha.png',
		resolvedIconUrl: 'https://example.com/gainer_alpha.png',
		tags: ['gainer', 'alpha', 'moonshot'],
		price: 1.25,
		priceChangePercentage24h: 285.5, // Significant positive change
		dailyVolume: 750000,
		website: 'https://gainercoinalpha.example.com',
		twitter: 'https://twitter.com/gainercoinalpha',
		coingeckoId: 'gainercoin-alpha',
		createdAt: timestampFromDate(new Date('2024-03-01')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2024-03-05')),
	}),
	create(CoinSchema, {
		mintAddress: 'rocketLaunchCoin1111111111111111111111',
		name: 'RocketLaunch',
		symbol: 'RLAUNCH',
		decimals: 6,
		description: 'This coin is launching to the moon, literally and figuratively!',
		iconUrl: 'https://example.com/rocket_launch.png',
		resolvedIconUrl: 'https://example.com/rocket_launch.png',
		tags: ['gainer', 'launch', 'rocket'],
		price: 0.075,
		priceChangePercentage24h: 150.2, // Significant positive change
		dailyVolume: 1200000,
		website: 'https://rocketlaunch.example.com',
		twitter: 'https://twitter.com/rocketlaunchcoin',
		coingeckoId: 'rocket-launch',
		createdAt: timestampFromDate(new Date('2024-02-15')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2024-02-20')),
	}),
	create(CoinSchema, {
		mintAddress: 'bullRunToken1111111111111111111111111',
		name: 'BullRun Token',
		symbol: 'BRT',
		decimals: 8,
		description: 'A token signifying the start of a massive bull run.',
		iconUrl: 'https://example.com/bull_run.png',
		resolvedIconUrl: 'https://example.com/bull_run.png',
		tags: ['gainer', 'bullish', 'market'],
		price: 5.60,
		priceChangePercentage24h: 95.75, // Significant positive change
		dailyVolume: 2500000,
		website: 'https://bullruntoken.example.com',
		twitter: 'https://twitter.com/bullruntoken',
		coingeckoId: 'bullrun-token',
		createdAt: timestampFromDate(new Date('2024-01-10')),
		lastUpdated: timestampFromDate(new Date()),
		isTrending: false,
		jupiterListedAt: timestampFromDate(new Date('2024-01-15')),
	}),
];

// All coins combined for general searches
export const ALL_MOCK_COINS = [...MOCK_TRENDING_COINS, ...MOCK_NEW_COINS, ...MOCK_TOP_GAINER_COINS];

// Mock wallet balances using exact gRPC types
export const MOCK_WALLET_BALANCES: Balance[] = [
	create(BalanceSchema, { id: 'so11111111111111111111111111111111111111112', amount: 2.5 }), // SOL
	create(BalanceSchema, { id: 'epjfwdd5aufqssqem2qn1xzybapc8g4weggkzwytdt1v', amount: 1000.0 }), // USDC
	create(BalanceSchema, { id: 'dankcoin1111111111111111111111111111111', amount: 5000000.0 }), // DANK
	create(BalanceSchema, { id: 'moontoken111111111111111111111111111111', amount: 250000.0 }), // MOON
	create(BalanceSchema, { id: 'bonk111111111111111111111111111111111111', amount: 10000000.0 }), // BONK
	create(BalanceSchema, { id: 'jupyiwryjfskupiha7hker8vutaefosybkedznsdvcn', amount: 150.0 }), // JUP
];
