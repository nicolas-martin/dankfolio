import { useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import { grpcApi } from '@/services/grpcApi';
import { logger } from '@/utils/logger';

// Can potentially move DEFAULT_LOGO to a constants file
const DEFAULT_LOGO = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

interface UseProxiedImageResult {
	imageUri: string | null;
	isLoading: boolean;
	error: string | null;
}

/**
 * Hook to fetch an image via the backend proxy service and return a data URI.
 * Handles loading state, errors, and fallback to a default logo.
 * @param originalImageUrl The original image URL to proxy.
 * @returns An object containing the image data URI, loading status, and error message.
 */
export const useProxiedImage = (originalImageUrl: string | undefined): UseProxiedImageResult => {
	const [imageUri, setImageUri] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;
		const urlToFetch = originalImageUrl || DEFAULT_LOGO;

		const fetchImage = async () => {
			if (!urlToFetch) {
				// This case should ideally not happen if DEFAULT_LOGO is always defined
				// If it does, it's a minor operational detail, not an error.
				// Keeping as console.log for local dev visibility if needed, but logger.debug might also be suitable.
				// For Sentry, this might be too noisy.
				// console.log("useProxiedImage: No URL and no default logo provided, and no internal default set.");
				logger.log("useProxiedImage: No URL provided, and no default logo available.");
				setIsLoading(false);
				setImageUri(null); // Or a placeholder image URI
				return;
			}

			setIsLoading(true);
			setError(null);
			setImageUri(null); // Reset while fetching

			try {
				// console.log(`useProxiedImage: Requesting proxied image for ${urlToFetch}`);
				const response = await grpcApi.getProxiedImage(urlToFetch);

				if (response.imageData) {
					const base64 = response.imageData;
					const dataUri = `data:image/png;base64,${base64}`;
					if (isMounted) {
						setImageUri(dataUri);
						// console.log(`useProxiedImage: Success for ${urlToFetch}`);
					}
				} else {
					logger.warn(`useProxiedImage: Empty image data response, using default.`, { urlToFetch });
					if (isMounted) setImageUri(DEFAULT_LOGO);
				}
			} catch (err) {
				logger.exception(err, { functionName: 'fetchImage', context: 'useProxiedImage', params: { urlToFetch } });
				if (isMounted) {
					setError(err.message);
					setImageUri(DEFAULT_LOGO);
				}
			} finally {
				if (isMounted) setIsLoading(false);
			}
		};

		fetchImage();

		return () => {
			isMounted = false;
		};
		// Re-fetch if the originalImageUrl changes
	}, [originalImageUrl]);

	return { imageUri, isLoading, error };
}; 