import { Buffer } from 'buffer'; // For base64 encoding
import utilityClient from '@/services/grpc/utilityClient'; // Assuming client setup path
import { connectErrorToString } from '@/utils/grpc';

export const DEFAULT_LOGO = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

/**
 * Fetches the image via the backend proxy service and returns a data URI.
 * @param imageUrl The original image URL to proxy.
 * @param setImageUri Callback function to set the resulting data URI in the component's state.
 */
export const fetchAndSetProxiedImage = async (
	imageUrl: string | undefined,
	setImageUri: (uri: string) => void
) => {
	// Use default logo if original URL is missing
	const urlToFetch = imageUrl || DEFAULT_LOGO;
	if (!urlToFetch) {
		console.log("Image Fetch: No URL provided and no default logo.")
		setImageUri(DEFAULT_LOGO); // Or set to a placeholder/null
		return;
	}

	try {
		console.log(`Image Fetch: Requesting proxied image for ${urlToFetch}`);
		const response = await utilityClient.getProxiedImage({
			imageUrl: urlToFetch,
		});

		if (response.imageData && response.contentType) {
			// Convert Uint8Array (or Buffer) to base64
			const base64 = Buffer.from(response.imageData).toString('base64');
			const dataUri = `data:${response.contentType};base64,${base64}`;
			setImageUri(dataUri);
			console.log(`Image Fetch: Success for ${urlToFetch}`);
		} else {
			console.warn(`Image Fetch: Empty response for ${urlToFetch}, using default.`);
			setImageUri(DEFAULT_LOGO); // Fallback on empty response
		}
	} catch (error) {
		console.error(`Image Fetch: Error fetching proxied image for ${urlToFetch}:`, connectErrorToString(error));
		setImageUri(DEFAULT_LOGO); // Fallback on error
	}
};
