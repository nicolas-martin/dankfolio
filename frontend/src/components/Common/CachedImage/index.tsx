import React, { useState, useCallback, useMemo } from 'react';
import { View } from 'react-native'; // StyleSheet removed
import ExpoCachedImage from 'expo-cached-image';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import { CachedImageProps } from './types';
import { logCacheResult } from './scripts';
import { useStyles } from './styles'; // Import useStyles
import { logger } from '@/utils/logger';

const CachedImage: React.FC<CachedImageProps> = ({
	uri,
	size = 50,
	borderRadius,
	style, // This is the prop 'style', not from a local StyleSheet
	testID,
	tintColor,
}) => {
	const styles = useStyles(); // Use the hook
	const [loadStartTime, setLoadStartTime] = useState<number>(0);
	const [hasError, setHasError] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const handleLoadStart = useCallback(() => {
		setLoadStartTime(Date.now());
		setIsLoading(true);
		setHasError(false);
	}, []);

	const handleLoadEnd = useCallback(() => {
		setIsLoading(false);
		if (loadStartTime > 0) {
			const loadTime = Date.now() - loadStartTime;
			const cacheKey = `${uri}-${size}x${size}`;
			logCacheResult(loadTime, uri, cacheKey);
		}
	}, [loadStartTime, uri, size]);

	const handleError = useCallback((error: unknown) => {
		const msg = error instanceof Error
			? error.message
			: String(error);
		logger.warn('[CachedImage] ❌ Load Error:', uri, msg);
		setIsLoading(false);
		setHasError(true);
	}, [uri]);

	// Default to circular if no borderRadius is provided
	const finalBorderRadius = borderRadius !== undefined ? borderRadius : size / 2;

	// All hooks must be at top level before any conditional returns
	const imageSource = useMemo(() => ({ uri }), [uri]);

	if (!uri || hasError) {
		return (
			<ShimmerPlaceholder
				width={size}
				height={size}
				borderRadius={finalBorderRadius}
			/>
		);
	}

	return (
		<View style={{ width: size, height: size, position: 'relative' }}>
			{isLoading && (
				<ShimmerPlaceholder
					width={size}
					height={size}
					borderRadius={finalBorderRadius}
				/>
			)}
			<ExpoCachedImage
				source={imageSource} // Use memoized source
				style={[
					styles.createImageStyle(size, finalBorderRadius, style), // Use function from styles
					isLoading && { position: 'absolute', opacity: 0 } // Hide image while loading
				]}
				cacheKey={`${uri}-${size}x${size}`}
				onLoadStart={handleLoadStart}
				onLoadEnd={handleLoadEnd}
				onError={handleError}
				testID={testID}
				tintColor={tintColor || undefined}
			/>
		</View>
	);
};

// Removed old PLACEHOLDER_COLOR and placeholderStyles StyleSheet.create block

export default CachedImage;

