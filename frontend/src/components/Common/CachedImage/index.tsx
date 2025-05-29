import React, { useState } from 'react';
import { Image } from 'expo-image';
import { CachedImageProps } from './types';

// Default blurhash for token images - a subtle gray blur
const DEFAULT_TOKEN_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

// IPFS gateways that don't redirect (in order of preference)
const IPFS_GATEWAYS = [
	'https://ipfs.io/ipfs/',
	'https://cloudflare-ipfs.com/ipfs/',
	'https://gateway.pinata.cloud/ipfs/',
];

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
	const [currentGatewayIndex, setCurrentGatewayIndex] = useState(0);
	const [hasError, setHasError] = useState(false);

	// Convert IPFS URLs to use faster gateways and avoid redirects
	let imageUrl = uri;
	if (uri && uri.includes('/ipfs/')) {
		// Extract IPFS hash from any IPFS URL
		const match = uri.match(/\/ipfs\/([^\/\?]+)/);
		if (match) {
			const ipfsHash = match[1];
			
			// Check if it's a CIDv0 (starts with Qm and is 46 chars)
			if (ipfsHash.startsWith('Qm') && ipfsHash.length === 46) {
				// For CIDv0, we need to convert to CIDv1 base32 for subdomain format
				// Since we can't easily convert CIDv0 to CIDv1 in JS without libraries,
				// we'll use the path format with a reliable gateway that handles conversion
				imageUrl = `${IPFS_GATEWAYS[currentGatewayIndex]}${ipfsHash}`;
			} else {
				// Assume it's already CIDv1, use subdomain format
				imageUrl = `https://${ipfsHash}.ipfs.dweb.link/`;
			}
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
		setHasError(false);
		setCurrentGatewayIndex(0); // Reset for next time
		onLoad?.(event);
	};

	const handleError = (error: any) => {
		console.log(`❌ Image failed to load: ${imageUrl || 'no URL'}`, error);
		
		// Try next gateway if this was an IPFS URL and we have more gateways to try
		if (uri && uri.includes('/ipfs/') && currentGatewayIndex < IPFS_GATEWAYS.length - 1) {
			console.log(`🔄 Trying next IPFS gateway (${currentGatewayIndex + 1}/${IPFS_GATEWAYS.length})`);
			setCurrentGatewayIndex(prev => prev + 1);
			return; // Don't set hasError yet, try next gateway
		}
		
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
