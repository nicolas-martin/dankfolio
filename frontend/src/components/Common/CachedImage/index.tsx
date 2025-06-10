import React, { useState, useCallback, useRef } from 'react';
import { Image, type ImageLoadEventData, type ImageErrorEventData } from 'expo-image';
import { CachedImageProps } from './types';

// Default blurhash for token images
const DEFAULT_TOKEN_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

export const CachedImage: React.FC<CachedImageProps> = ({
	uri,
	size = 40,
	borderRadius = 20,
	blurhash,
	placeholder,
	style,
	onLoad,
	onError,
	testID,
	...imageProps
}) => {
	const [hasError, setHasError] = useState(false);
	const loadStartTimeRef = useRef<number | null>(null);

	// Start timing when image begins loading
	const handleLoadStart = useCallback(() => {
		loadStartTimeRef.current = Date.now();
	}, []);

	// Log cache hit/miss and load time
	const handleLoad = useCallback((event: ImageLoadEventData) => {
		const loadTime = loadStartTimeRef.current ? Date.now() - loadStartTimeRef.current : 0;
		const { cacheType } = event;
		
		// Simple cache detection
		const isHit = cacheType !== 'none' || loadTime === 0;
		const status = isHit ? 'Cache Hit' : 'Cache Miss';
		const emoji = isHit ? '⚡': '🐢'
		
		console.log(`[CachedImage] ${emoji} ${status} | Type: ${cacheType} | Time: ${loadTime}ms | URL: ${uri}`);
		
		setHasError(false);
		onLoad?.(event);
	}, [uri, onLoad]);

	// Log errors with URL
	const handleError = useCallback((error: ImageErrorEventData) => {
		const loadTime = loadStartTimeRef.current ? Date.now() - loadStartTimeRef.current : 0;
		console.log(`[CachedImage] ❌ Error | Time: ${loadTime}ms | URL: ${uri} | Error:`, error);
		
		setHasError(true);
		onError?.(error);
	}, [uri, onError]);

	// Simple placeholder setup
	const imagePlaceholder = placeholder || { blurhash: blurhash || DEFAULT_TOKEN_BLURHASH };

	if (!uri || hasError) {
		return (
			<Image
				style={[{ width: size, height: size, borderRadius }, style]}
				placeholder={imagePlaceholder}
				testID={testID}
			/>
		);
	}

	return (
		<Image
			source={{ uri }}
			style={[{ width: size, height: size, borderRadius }, style]}
			contentFit="cover"
			cachePolicy="memory-disk"
			placeholder={imagePlaceholder}
			onLoadStart={handleLoadStart}
			onLoad={handleLoad}
			onError={handleError}
			testID={testID}
			priority="normal"
			{...imageProps}
		/>
	);
}; 

