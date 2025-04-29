import { useState, useEffect } from 'react';
import { Buffer } from 'buffer';
import grpcApi from '@/services/grpcApi';

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
				console.log("useProxiedImage: No URL and no default logo.");
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

				if (response.imageData && response.contentType) {
					const base64 = Buffer.from(response.imageData).toString('base64');
					const dataUri = `data:${response.contentType};base64,${base64}`;
					if (isMounted) {
						setImageUri(dataUri);
						// console.log(`useProxiedImage: Success for ${urlToFetch}`);
					}
				} else {
					console.warn(`useProxiedImage: Empty response for ${urlToFetch}, using default.`);
					if (isMounted) setImageUri(DEFAULT_LOGO);
				}
			} catch (err) {
				console.error(`useProxiedImage: Error fetching proxied image for ${urlToFetch}:`, err);
				if (isMounted) {
					setError(err.message);
					setImageUri(DEFAULT_LOGO); // Fallback on error
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