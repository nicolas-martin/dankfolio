import React, { useState, useCallback, useMemo } from 'react';
import { View } from 'react-native'; // StyleSheet removed
import ExpoCachedImage from 'expo-cached-image';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import { CachedImageProps } from './types';
import { logCacheResult } from './scripts';
import { useStyles } from './styles'; // Import useStyles
import { logger } from '@/utils/logger';
import { resolveIpfsUrl } from '@/utils/ipfsResolver';

const CachedImage: React.FC<CachedImageProps> = React.memo(({
	uri,
	size = 50,
	borderRadius,
	style, // This is the prop 'style', not from a local StyleSheet
	testID,
	tintColor,
	priority = 'normal',
	onLoadStart: onLoadStartProp,
	onLoadEnd: onLoadEndProp,
	onError: onErrorProp,
}) => {
	const styles = useStyles(); // Use the hook
	const [loadStartTime, setLoadStartTime] = useState<number>(0);
	const [hasError, setHasError] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const handleLoadStart = useCallback(() => {
		setLoadStartTime(Date.now());
		setIsLoading(true);
		setHasError(false);
		onLoadStartProp?.();
	}, [onLoadStartProp]);

	const handleLoadEnd = useCallback(() => {
		setIsLoading(false);
		if (loadStartTime > 0) {
			const loadTime = Date.now() - loadStartTime;
			const cacheKey = `${resolvedUri}-${size}x${size}`;
			logCacheResult(loadTime, resolvedUri || uri, cacheKey);
		}
		onLoadEndProp?.();
	}, [loadStartTime, uri, resolvedUri, size, onLoadEndProp]);

	const handleError = useCallback((error: unknown) => {
		const msg = error instanceof Error
			? error.message
			: String(error);
		logger.warn('[CachedImage] ❌ Load Error:', uri, msg);
		setIsLoading(false);
		setHasError(true);
		onErrorProp?.(error);
	}, [uri, onErrorProp]);

	// Default to circular if no borderRadius is provided
	const finalBorderRadius = borderRadius !== undefined ? borderRadius : size / 2;

	// Resolve IPFS URLs to HTTP gateway URLs
	const resolvedUri = useMemo(() => resolveIpfsUrl(uri), [uri]);

	// All hooks must be at top level before any conditional returns
	const imageSource = useMemo(() => ({ uri: resolvedUri }), [resolvedUri]);

	// Memoize the style array to avoid re-creating on each render
	const imageStyle = useMemo(() => {
		const baseStyle = styles.createImageStyle(size, finalBorderRadius, style);
		return isLoading ? [baseStyle, styles.hiddenImage] : baseStyle;
	}, [styles, size, finalBorderRadius, style, isLoading]);

	if (!resolvedUri || hasError) {
		return (
			<ShimmerPlaceholder
				width={size}
				height={size}
				borderRadius={finalBorderRadius}
			/>
		);
	}

	return (
		<View style={styles.createContainerStyle(size)}>
			{isLoading && (
				<ShimmerPlaceholder
					width={size}
					height={size}
					borderRadius={finalBorderRadius}
				/>
			)}
			<ExpoCachedImage
				source={imageSource} // Use memoized source
				style={imageStyle} // Use memoized style
				cacheKey={`${resolvedUri}`}
				onLoadStart={handleLoadStart}
				onLoadEnd={handleLoadEnd}
				onError={handleError}
				testID={testID}
				tintColor={tintColor || undefined}
				priority={priority}
				cachePolicy="disk"
			/>
		</View>
	);
}, (prevProps, nextProps) => {
	// Custom comparison function for memo
	return (
		prevProps.uri === nextProps.uri &&
		prevProps.size === nextProps.size &&
		prevProps.borderRadius === nextProps.borderRadius &&
		prevProps.style === nextProps.style &&
		prevProps.testID === nextProps.testID &&
		prevProps.tintColor === nextProps.tintColor &&
		prevProps.priority === nextProps.priority
	);
});

CachedImage.displayName = 'CachedImage';

// Removed old PLACEHOLDER_COLOR and placeholderStyles StyleSheet.create block

export default CachedImage;

