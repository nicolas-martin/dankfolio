import React, { useState } from 'react';
import { Image } from 'expo-image';
import { CachedImageProps } from './types';

// Default blurhash for token images - a subtle gray blur
const DEFAULT_TOKEN_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export const CachedImage: React.FC<CachedImageProps> = ({
	uri,
	size = 40,
	borderRadius = 20,
	fallbackText,
	blurhash,
	placeholder,
	showLoadingIndicator = false,
	style,
	onLoad,
	onError,
	testID,
	...imageProps
}) => {

	const [hasError, setHasError] = useState(false);
	const [imageUriToLoad, setImageUriToLoad] = useState<string | null>(null);
	const [didAttemptLoad, setDidAttemptLoad] = useState(false);

	// The 'uri' is now used directly. All IPFS-specific logic is removed.
	// The parent component is expected to pass coin.resolved_icon_url (if available)
	// or coin.icon_url. This component no longer resolves IPFS URIs.


	// Prepare placeholder - prioritize passed placeholder, then blurhash, then default blurhash
	let imagePlaceholder = placeholder;
	if (!imagePlaceholder) {
		const hashToUse = blurhash || DEFAULT_TOKEN_BLURHASH;
		imagePlaceholder = { blurhash: hashToUse };
	}

	useEffect(() => {
		// Only attempt to load if a URI is provided and we haven't tried yet,
		// or if the URI has changed.
		if (uri && (!didAttemptLoad || uri !== imageUriToLoad)) {
			// Reset error state if URI changes
			if (uri !== imageUriToLoad) {
				setHasError(false);
			}
			setDidAttemptLoad(true);
			setImageUriToLoad(uri);
			// console.log(`[${new Date().toISOString()}] ⏳ Attempting to load image: ${uri}`);
		} else if (!uri) {
			// If URI is cleared, reset states
			setImageUriToLoad(null);
			setDidAttemptLoad(false);
			setHasError(false);
		}
	}, [uri, didAttemptLoad, imageUriToLoad]); // Added imageUriToLoad to dependencies

	// Enhanced logging callbacks
	const handleLoad = (event: any) => {
		// console.log(`[${new Date().toISOString()}] ✅ Image loaded successfully: ${imageUriToLoad || 'placeholder'}`);
		setHasError(false);

		// // No need to reset currentGatewayIndex as it's removed.

		onLoad?.(event);
	};

	const handleError = (error: any) => {
		// console.log(`[${new Date().toISOString()}] ❌ Image failed to load: ${imageUriToLoad || 'no URL'}`, { message: error?.message, code: error?.code, domain: error?.domain, fullError: error });

		// IPFS gateway switching logic is removed.
		// If the resolved_icon_url (or icon_url) fails, it's now simply an error.

		setHasError(true);
		onError?.(error);
	};

	return (
		<Image
			source={imageUriToLoad ? { uri: imageUriToLoad } : undefined}
			style={[
				{
					width: size,
					height: size,
					borderRadius,
				},
				style,
			]}
			contentFit="cover"
			transition={300}
			cachePolicy="disk"
			placeholder={imagePlaceholder}
			onLoad={handleLoad}
			onError={handleError}
			testID={testID}
			{...imageProps}
		/>
	);
}; 
