/**
 * Utility to resolve IPFS URLs to HTTP gateway URLs
 */

const IPFS_GATEWAYS = [
	'https://ipfs.io/ipfs/',
	'https://cloudflare-ipfs.com/ipfs/',
	'https://gateway.pinata.cloud/ipfs/',
	'https://ipfs.dweb.link/ipfs/',
];

/**
 * Checks if a URL is an IPFS URL
 */
export const isIpfsUrl = (url: string | undefined): boolean => {
	if (!url) return false;
	
	return (
		url.startsWith('ipfs://') ||
		url.includes('ipfs.io') ||
		url.includes('ipfs.dweb.link') ||
		url.includes('cf-ipfs.com') ||
		url.includes('cloudflare-ipfs.com') ||
		url.includes('gateway.pinata.cloud')
	);
};

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
	
	return null;
};

/**
 * Resolves an IPFS URL to a standard HTTP gateway URL
 */
export const resolveIpfsUrl = (url: string | undefined): string | undefined => {
	if (!url) return undefined;
	
	// If it's not an IPFS URL, return as is
	if (!isIpfsUrl(url)) {
		return url;
	}
	
	// Extract IPFS hash
	const ipfsHash = extractIpfsHash(url);
	if (!ipfsHash) {
		console.warn('[ipfsResolver] Could not extract IPFS hash from URL:', url);
		return url;
	}
	
	// Use the first gateway as default
	// In production, you might want to implement fallback logic
	return `${IPFS_GATEWAYS[0]}${ipfsHash}`;
};

/**
 * Batch resolves multiple IPFS URLs
 */
export const resolveIpfsUrls = (urls: (string | undefined)[]): (string | undefined)[] => {
	return urls.map(resolveIpfsUrl);
};