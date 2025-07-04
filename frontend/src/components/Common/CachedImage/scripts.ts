import { logger } from '@/utils/logger';

// Real image URLs from mock data for testing
const REAL_TEST_IMAGES = [
	{
		name: 'SOL',
		url: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
		symbol: 'SOL'
	},
	{
		name: 'USDC',
		url: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
		symbol: 'USDC'
	},
	{
		name: 'DankCoin',
		url: 'https://static.wikia.nocookie.net/dank_memer/images/e/e6/Site-logo.png',
		symbol: 'DANK'
	},
	{
		name: 'SafeMoon',
		url: 'https://upload.wikimedia.org/wikipedia/en/thumb/9/9e/SafeMoon_Logo.svg/1920px-SafeMoon_Logo.svg.png',
		symbol: 'MOON'
	},
	{
		name: 'Bonk',
		url: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I',
		symbol: 'BONK'
	},
	{
		name: 'Jupiter',
		url: 'https://static.jup.ag/jup/icon.png',
		symbol: 'JUP'
	}
];

// Cache debugging utilities
export const debugCacheStatus = async (uri: string) => {
	try {
		// Simple cache test - try to load the same image twice quickly
		const startTime = Date.now();

		// First load
		const response1 = await fetch(uri, { method: 'HEAD' });
		const firstLoadTime = Date.now() - startTime;

		// Second load (should be cached)
		const startTime2 = Date.now();
		const _response2 = await fetch(uri, { method: 'HEAD' });
		const secondLoadTime = Date.now() - startTime2;

		logger.info(`[CacheDebug] 🔍 Network Test | URL: ${uri}`);
		logger.info(`[CacheDebug] First load: ${firstLoadTime}ms | Second load: ${secondLoadTime}ms`);
		logger.info(`[CacheDebug] Response headers:`, {
			cacheControl: response1.headers.get('cache-control'),
			etag: response1.headers.get('etag'),
			lastModified: response1.headers.get('last-modified'),
			expires: response1.headers.get('expires')
		});

		return {
			firstLoadTime,
			secondLoadTime,
			cacheHeaders: {
				cacheControl: response1.headers.get('cache-control'),
				etag: response1.headers.get('etag'),
				lastModified: response1.headers.get('last-modified'),
				expires: response1.headers.get('expires')
			}
		};
	} catch (error) {
		logger.error(`[CacheDebug] ❌ Network test failed for ${uri}:`, error);
		return null;
	}
};

// Test expo-cached-image with real images from mock data
export const testExpoImageCache = async (testUri?: string) => {
	logger.info(`[CacheDebug] 🧪 Testing expo-cached-image with REAL images from mock data`);

	// Log current cache settings
	logger.info(`[CacheDebug] Using: expo-cached-image`);
	logger.info(`[CacheDebug] Cache: File system based`);

	// Use real test images from mock data
	const testImages = [...REAL_TEST_IMAGES];

	// Add the provided test URI if any
	if (testUri) {
		testImages.push({
			name: 'Custom',
			url: testUri,
			symbol: 'CUSTOM'
		});
	}

	logger.info(`[CacheDebug] 🖼️ Testing ${testImages.length} real images from mock data`);

	// Test each image
	for (let i = 0; i < testImages.length; i++) {
		const image = testImages[i];

		logger.info(`[CacheDebug] 📸 Testing ${i + 1}/${testImages.length}: ${image.name} (${image.symbol})`);
		logger.info(`[CacheDebug] 🔗 URL: ${image.url}`);

		// Test network caching for this image
		await debugCacheStatus(image.url);

		// Add a small delay between tests
		await new Promise(resolve => setTimeout(resolve, 100));
	}

	logger.info(`[CacheDebug] ✅ Real image cache test completed`);
	logger.info(`[CacheDebug] 💡 Now scroll through the app to see actual expo-cached-image performance!`);
	return true;
};

// Helper to get a friendly name for the image
const getImageName = (uri: string): string => {
	// Check against our real test images first
	const realImage = REAL_TEST_IMAGES.find(img => img.url === uri);
	if (realImage) {
		return `${realImage.name} (${realImage.symbol})`;
	}

	// Extract filename from URL
	const parts = uri.split('/');
	const filename = parts[parts.length - 1] || 'Unknown';
	return filename.replace('.png', '').replace('.jpg', '').replace('.jpeg', '');
};

// Enhanced cache hit/miss detection with cache key and actual expiry info
export const logCacheResult = (loadTime: number, uri: string, cacheKey: string) => {
	const isLikelyHit = loadTime < 50; // Less than 50ms is likely a cache hit
	const status = isLikelyHit ? 'HIT' : 'MISS';
	const emoji = isLikelyHit ? '⚡' : '🐢';
	const imageName = getImageName(uri);

	logger.info(`[CacheResult] ${emoji} ${status} | ${imageName} | ${loadTime}ms | cacheKey: ${cacheKey}`);

	return { isLikelyHit, status, loadTime, cacheKey };
}; 
