import React from 'react';
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

	// Convert IPFS URLs to use faster gateways
	let imageUrl = uri;
	if (uri && uri.includes('/ipfs/')) {
		// Extract IPFS hash from any IPFS URL
		const match = uri.match(/\/ipfs\/([^\/\?]+)/);
		if (match) {
			const ipfsHash = match[1];
			// Use dweb.link as primary gateway (faster than ipfs.io)
			imageUrl = `https://dweb.link/ipfs/${ipfsHash}`;
		}
	}

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
		onLoad?.(event);
	};

	const handleError = (error: any) => {
		// console.log(`❌ Image failed to load: ${imageUrl || 'no URL'}`, error);
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
