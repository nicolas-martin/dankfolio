import { logger } from '@/utils/logger';

// Helper to get a friendly name for the image
const getImageName = (uri: string): string => {
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

	logger.log(`[CacheResult] ${emoji} ${status} | ${imageName} | ${loadTime}ms | cacheKey: ${cacheKey}`);

	return { isLikelyHit, status, loadTime, cacheKey };
}; 
