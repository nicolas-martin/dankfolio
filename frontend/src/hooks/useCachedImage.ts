import { useState, useEffect } from 'react';

// Potentially move DEFAULT_LOGO to a constants file later
const DEFAULT_LOGO = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

interface UseCachedImageResult {
	imageUri: string | null;
	isLoading: boolean;
	error: string | null; // Or a more specific error type
}

export const useCachedImage = (originalImageUrl: string | undefined): UseCachedImageResult => {
	const [imageUri, setImageUri] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setIsLoading(true);
		setError(null);

		if (originalImageUrl && originalImageUrl.trim() !== '') {
			setImageUri(originalImageUrl);
		} else {
			// console.log("useCachedImage: No originalImageUrl provided, using default logo.");
			setImageUri(DEFAULT_LOGO);
		}
		// For this hook, we are not doing the actual image fetching here,
		// expo-image component will do that. So, we can set loading to false
		// relatively quickly. The actual visual loading will be handled by expo-image's props.
		setIsLoading(false);

	}, [originalImageUrl]);

	return { imageUri, isLoading, error };
};

