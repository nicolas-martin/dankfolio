
/**
 * Utility to resolve IPFS URLs to HTTP gateway URLs
 */
const IPFS_GATEWAYS = [
	'https://gateway.pinata.cloud/ipfs/',
	'https://pump.mypinata.cloud/ipfs/',
	'https://ipfs.io/ipfs/',
	'https://cloudflare-ipfs.com/ipfs/',
	'https://ipfs.dweb.link/ipfs/',
];

const GATEWAY_HOSTS = IPFS_GATEWAYS.map(gw => new URL(gw).hostname);

/**
 * Extracts IPFS hash from various IPFS URL formats
 */
const extractIpfsHash = (url: string): string | null => {
	// Handle ipfs:// protocol
	if (url.startsWith('ipfs://')) {
		return url.replace('ipfs://', '');
	}

	// Handle HTTP IPFS gateway URLs
	const ipfsMatch = url.match(/\/ipfs\/([^?#]+)/);
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

	const ipfsHash = extractIpfsHash(url);

	if (!ipfsHash) {
		// Not an IPFS URL we can handle, return as is.
		return url;
	}

	// It is an IPFS URL. Check if it's using one of our known gateways.
	try {
		const urlObject = new URL(url);
		if (GATEWAY_HOSTS.includes(urlObject.hostname)) {
			// It's already a known and good gateway URL. Return it to preserve query params etc.
			return url;
		}
	} catch {
		// Not a valid URL object, e.g. ipfs://, so we'll proceed to build a new one.
	}

	// It's an IPFS URL, but not using one of our preferred gateways, or it's an ipfs:// URL.
	// Build a new URL with our preferred gateway.
	const newUrl = `${IPFS_GATEWAYS[0]}${ipfsHash}`;
	return newUrl;
};

