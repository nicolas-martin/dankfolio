import ExpoCachedImage from 'expo-cached-image';
import { logger } from '@/utils/logger';
import { resolveIpfsUrl } from '@/utils/ipfsResolver';

interface PreloadOptions {
	size?: number;
	priority?: 'low' | 'normal' | 'high';
}

class ImagePreloader {
	private preloadQueue: Array<{ uri: string; options: PreloadOptions }> = [];
	private isProcessing = false;
	private preloadedUrls = new Set<string>();

	/**
	 * Preload a single image
	 */
	async preloadImage(uri: string, options: PreloadOptions = {}): Promise<void> {
		const { size = 50 } = options;
		const resolvedUri = resolveIpfsUrl(uri);
		const cacheKey = `${resolvedUri}-${size}x${size}`;

		if (this.preloadedUrls.has(cacheKey)) {
			logger.debug(`[ImagePreloader] Already preloaded: ${cacheKey}`);
			return;
		}

		try {
			await ExpoCachedImage.prefetch(resolvedUri);
			this.preloadedUrls.add(cacheKey);
			logger.debug(`[ImagePreloader] ✅ Preloaded: ${cacheKey}`);
		} catch (error) {
			logger.warn(`[ImagePreloader] ❌ Failed to preload ${uri}:`, error);
		}
	}

	/**
	 * Preload multiple images
	 */
	async preloadImages(uris: string[], options: PreloadOptions = {}): Promise<void> {
		const promises = uris.map(uri => this.preloadImage(uri, options));
		await Promise.allSettled(promises);
	}

	/**
	 * Add images to preload queue
	 */
	addToQueue(uri: string, options: PreloadOptions = {}): void {
		this.preloadQueue.push({ uri, options });
		this.processQueue();
	}

	/**
	 * Process the preload queue
	 */
	private async processQueue(): Promise<void> {
		if (this.isProcessing || this.preloadQueue.length === 0) {
			return;
		}

		this.isProcessing = true;

		while (this.preloadQueue.length > 0) {
			const batch = this.preloadQueue.splice(0, 5); // Process 5 at a time
			await Promise.allSettled(
				batch.map(({ uri, options }) => this.preloadImage(uri, options))
			);
		}

		this.isProcessing = false;
	}

	/**
	 * Clear preload cache tracking (not the actual cache)
	 */
	clearTracking(): void {
		this.preloadedUrls.clear();
		this.preloadQueue = [];
	}

	/**
	 * Preload common coin images
	 */
	async preloadCommonCoins(): Promise<void> {
		const commonCoins = [
			'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png', // SOL
			'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png', // USDC
			'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I', // BONK
			'https://static.jup.ag/jup/icon.png', // JUP
		];

		await this.preloadImages(commonCoins, { size: 40, priority: 'high' });
	}
}

// Export singleton instance
export const imagePreloader = new ImagePreloader();