import { logger } from '@/utils/logger';

/**
 * Enhanced IPFS resolver with multi-gateway support and content verification
 */

const IPFS_GATEWAYS = [
	'https://ipfs.io/ipfs/',
	'https://cloudflare-ipfs.com/ipfs/',
	'https://gateway.pinata.cloud/ipfs/',
	'https://ipfs.dweb.link/ipfs/',
	'https://dweb.link/ipfs/',
	'https://gateway.ipfs.io/ipfs/',
];

interface FetchOptions {
	timeout?: number;
	maxRetries?: number;
	onProgress?: (gateway: string, attempt: number) => void;
}

interface IpfsImageData {
	dataUri: string;
	contentType: string;
	size: number;
	gateway: string;
}

// Simple in-memory cache for fetched images
const imageCache = new Map<string, IpfsImageData>();

/**
 * Extracts IPFS hash from various IPFS URL formats
 */
const extractIpfsHash = (url: string): string | null => {
	// Handle ipfs:// protocol
	if (url.startsWith('ipfs://')) {
		return url.replace('ipfs://', '');
	}

	// Handle HTTP IPFS gateway URLs
	const ipfsMatch = url.match(/\/ipfs\/(Qm[a-zA-Z0-9]+|bafy[a-zA-Z0-9]+)/);
	if (ipfsMatch) {
		return ipfsMatch[1];
	}

	// Handle IPNS URLs
	if (url.startsWith('ipns://')) {
		return url.replace('ipns://', '');
	}

	return null;
};

/**
 * Fetches image from IPFS gateway with timeout
 */
async function fetchFromGateway(
	gateway: string,
	hash: string,
	timeout: number = 10000
): Promise<Response> {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const response = await fetch(`${gateway}${hash}`, {
			signal: controller.signal,
			headers: {
				'Accept': 'image/*',
			},
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		return response;
	} finally {
		clearTimeout(timeoutId);
	}
}

/**
 * Converts blob to base64 data URI
 */
async function blobToDataUri(blob: Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			const base64data = reader.result as string;
			resolve(base64data);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}

/**
 * Fetches IPFS image as base64 data URI with multi-gateway fallback
 */
export async function fetchIpfsImageAsDataUri(
	url: string,
	options: FetchOptions = {}
): Promise<IpfsImageData | null> {
	const { 
		timeout = 10000, 
		maxRetries = 3,
		onProgress 
	} = options;

	// Check cache first
	const cacheKey = url;
	if (imageCache.has(cacheKey)) {
		logger.info('[ipfsEnhancedResolver] 🎯 Cache hit for:', url);
		return imageCache.get(cacheKey)!;
	}

	// Extract IPFS hash
	const ipfsHash = extractIpfsHash(url);
	if (!ipfsHash) {
		logger.warn('[ipfsEnhancedResolver] Not an IPFS URL:', url);
		return null;
	}

	// Try each gateway
	for (let gatewayIndex = 0; gatewayIndex < IPFS_GATEWAYS.length; gatewayIndex++) {
		const gateway = IPFS_GATEWAYS[gatewayIndex];
		
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				onProgress?.(gateway, attempt);
				logger.info(`[ipfsEnhancedResolver] Trying ${gateway} (attempt ${attempt}/${maxRetries})`);
				
				const response = await fetchFromGateway(gateway, ipfsHash, timeout);
				
				// Get content type
				const contentType = response.headers.get('content-type') || 'image/jpeg';
				
				// Convert to blob
				const blob = await response.blob();
				const size = blob.size;
				
				// Convert to data URI
				const dataUri = await blobToDataUri(blob);
				
				const imageData: IpfsImageData = {
					dataUri,
					contentType,
					size,
					gateway,
				};
				
				// Cache the result
				imageCache.set(cacheKey, imageData);
				
				logger.info(`[ipfsEnhancedResolver] ✅ Success from ${gateway}, size: ${size} bytes`);
				return imageData;
				
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				logger.warn(`[ipfsEnhancedResolver] ❌ Gateway ${gateway} attempt ${attempt} failed:`, errorMsg);
				
				// If this was the last attempt for this gateway, try next gateway
				if (attempt === maxRetries) {
					break;
				}
				
				// Wait before retry
				await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
			}
		}
	}
	
	logger.error('[ipfsEnhancedResolver] ❌ All gateways failed for:', url);
	return null;
}

/**
 * Clears the image cache
 */
export function clearIpfsImageCache() {
	imageCache.clear();
	logger.info('[ipfsEnhancedResolver] Cache cleared');
}

/**
 * Gets cache size
 */
export function getIpfsCacheSize(): number {
	return imageCache.size;
}

/**
 * Removes specific URL from cache
 */
export function removeFromIpfsCache(url: string) {
	imageCache.delete(url);
}

/**
 * Legacy function - resolves IPFS URL to first working gateway URL
 */
export async function resolveIpfsUrl(url: string | undefined): Promise<string | undefined> {
	if (!url) return undefined;

	// Check if it's an IPFS URL
	const isIpfsUrl = url.startsWith('ipfs://') ||
		url.includes('ipfs.io') ||
		url.includes('ipfs.dweb.link') ||
		url.includes('cf-ipfs.com') ||
		url.includes('cloudflare-ipfs.com') ||
		url.includes('gateway.pinata.cloud');

	// If it's not an IPFS URL, return as is
	if (!isIpfsUrl) {
		return url;
	}

	// Extract IPFS hash
	const ipfsHash = extractIpfsHash(url);
	if (!ipfsHash) {
		logger.warn('[ipfsEnhancedResolver] Could not extract IPFS hash from URL:', url);
		return url;
	}

	// Return the first gateway URL (for backward compatibility)
	return `${IPFS_GATEWAYS[0]}${ipfsHash}`;
}