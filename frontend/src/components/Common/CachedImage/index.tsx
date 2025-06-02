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

	// The 'uri' is now used directly. All IPFS-specific logic is removed.
	// The parent component is expected to pass coin.resolved_icon_url (if available)
	// or coin.icon_url. This component no longer resolves IPFS URIs.
	const imageUrl = uri;


	// Debug logging
	if (imageUrl) {
		// console.log(`🖼️ Loading image: ${imageUrl}`);
	}

	// Prepare placeholder - prioritize passed placeholder, then blurhash, then default blurhash
	let imagePlaceholder = placeholder;
	if (!imagePlaceholder) {
		const hashToUse = blurhash || DEFAULT_TOKEN_BLURHASH;
		imagePlaceholder = { blurhash: hashToUse };
	}

	// Enhanced logging callbacks
	const handleLoad = (event: any) => {
		// console.log(`✅ Image loaded successfully: ${imageUrl || 'placeholder'}`);
		setHasError(false);

		// No need to reset currentGatewayIndex as it's removed.

		onLoad?.(event);
	};

	const handleError = (error: any) => {
		console.log(`❌ Image failed to load: ${imageUrl || 'no URL'}`, error);

		// IPFS gateway switching logic is removed.
		// If the resolved_icon_url (or icon_url) fails, it's now simply an error.

		setHasError(true);
		onError?.(error);
	};

	return (
		<Image
			source={imageUrl ? { uri: imageUrl } : undefined}
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
