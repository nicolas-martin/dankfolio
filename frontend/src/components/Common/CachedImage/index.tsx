import React, { useState, useEffect, useCallback, useRef } from 'react';

import { Image, type ImageLoadEventData, type ImageErrorEventData } from 'expo-image'; // Import event types
import { CachedImageProps } from './types';
import { performanceMonitor } from '@/utils/performanceMonitor';

// Default blurhash for token images - a subtle gray blur
const DEFAULT_TOKEN_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

// Global queue to manage image loading and prevent UI blocking
class ImageLoadQueue {
	private queue: Array<() => void> = [];
	private isProcessing = false;
	private readonly maxConcurrent = 3; // Limit concurrent image loads
	private currentLoading = 0;

	add(loadFn: () => void) {
		this.queue.push(loadFn);
		this.process();
	}

	private async process() {
		if (this.isProcessing || this.currentLoading >= this.maxConcurrent) return;

		this.isProcessing = true;

		while (this.queue.length > 0 && this.currentLoading < this.maxConcurrent) {
			const loadFn = this.queue.shift();
			if (loadFn) {
				this.currentLoading++;
				// Use setTimeout to prevent blocking the main thread
				setTimeout(() => {
					loadFn();
					this.currentLoading--;
					this.process(); // Process next in queue
				}, 16); // ~60fps frame time
			}
		}

		this.isProcessing = false;
	}
}

const imageLoadQueue = new ImageLoadQueue();

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

	const [_hasError, setHasError] = useState(false); // Renamed hasError
	const [imageUriToLoad, setImageUriToLoad] = useState<string | null>(null);
	const [didAttemptLoad, setDidAttemptLoad] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const mountedRef = useRef(true);
	const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			mountedRef.current = false;
			if (loadTimeoutRef.current) {
				clearTimeout(loadTimeoutRef.current);
			}
		};
	}, []);

	// The 'uri' is now used directly. All IPFS-specific logic is removed.
	// The parent component is expected to pass coin.resolved_icon_url (if available)
	// or coin.icon_url. This component no longer resolves IPFS URIs.

	// Prepare placeholder - prioritize passed placeholder, then blurhash, then default blurhash
	let imagePlaceholder = placeholder;
	if (!imagePlaceholder) {
		const hashToUse = blurhash || DEFAULT_TOKEN_BLURHASH;
		imagePlaceholder = { blurhash: hashToUse };
	}

	// Debounced state update function to prevent rapid state changes
	const debouncedSetImageUri = useCallback((newUri: string | null) => {
		if (loadTimeoutRef.current) {
			clearTimeout(loadTimeoutRef.current);
		}

		loadTimeoutRef.current = setTimeout(() => {
			if (mountedRef.current) {
				setImageUriToLoad(newUri);
			}
		}, 50); // 50ms debounce
	}, []);

	useEffect(() => {
		if (uri && uri.trim() !== "" && (!didAttemptLoad || uri !== imageUriToLoad)) { // Check for non-empty string
			// Reset error state if URI changes
			if (uri !== imageUriToLoad) {
				setHasError(false);
				setIsLoading(true);
			}

			imageLoadQueue.add(() => {
				if (mountedRef.current) {
					setDidAttemptLoad(true);
					debouncedSetImageUri(uri);
					performanceMonitor.startImageLoad(uri);
				}
			});
		} else if (!uri || uri.trim() === "") { // Handle null, undefined, or empty string
			// If URI is cleared or empty, reset states
			setImageUriToLoad(null);
			setDidAttemptLoad(false);
			setHasError(false);
			setIsLoading(false);
		}
	}, [uri, didAttemptLoad, imageUriToLoad, debouncedSetImageUri]);

	// Enhanced logging callbacks with better performance
	const handleLoad = useCallback((event: ImageLoadEventData) => { // Typed event
		if (!mountedRef.current) return;

		// Use requestAnimationFrame to ensure smooth UI updates
		requestAnimationFrame(() => {
			if (mountedRef.current) {
				setHasError(false);
				setIsLoading(false);
				// Track performance
				if (imageUriToLoad) {
					performanceMonitor.endImageLoad(imageUriToLoad, true);
				}
				onLoad?.(event);
			}
		});
	}, [onLoad, imageUriToLoad]);

	const handleError = useCallback((error: ImageErrorEventData) => { // Typed error
		if (!mountedRef.current) return;

		// Use requestAnimationFrame to ensure smooth UI updates
		requestAnimationFrame(() => {
			if (mountedRef.current) {
				setHasError(true);
				setIsLoading(false);
				// Track performance
				if (imageUriToLoad) {
					performanceMonitor.endImageLoad(imageUriToLoad, false);
				}
				onError?.(error);
			}
		});
	}, [onError, imageUriToLoad]);

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
			transition={isLoading ? 0 : 300} // Disable transition while loading to improve performance
			cachePolicy="disk"
			placeholder={imagePlaceholder}
			onLoad={handleLoad}
			onError={handleError}
			testID={testID}
			priority="low" // Set low priority to prevent blocking critical renders
			{...imageProps}
		/>
	);
}; 

