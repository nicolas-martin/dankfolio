import React, { useState, useCallback, useMemo } from 'react';
import { View } from 'react-native'; // StyleSheet removed
import ExpoCachedImage from 'expo-cached-image';
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

	const handleLoadStart = useCallback(() => {
		setLoadStartTime(Date.now());
	}, []);

	const handleLoadEnd = useCallback(() => {
		if (loadStartTime > 0) {
			const loadTime = Date.now() - loadStartTime;
			const cacheKey = `${uri}-${size}x${size}`;
			logCacheResult(loadTime, uri, cacheKey);
		}
	}, [loadStartTime, uri, size]);

	const handleError = useCallback((error: unknown) => {
		logger.warn('[CachedImage] ❌ Load Error:', uri, error);
	}, [uri]);

	// Default to circular if no borderRadius is provided
	const finalBorderRadius = borderRadius !== undefined ? borderRadius : size / 2;

	// All hooks must be at top level before any conditional returns
	const imageSource = useMemo(() => ({ uri }), [uri]);

	if (!uri) {
		return (
			<View
				style={styles.createPlaceholderStyle(size, finalBorderRadius)} // Apply the function from styles
			/>
		);
	}

	return (
		<ExpoCachedImage
			source={imageSource} // Use memoized source
			style={styles.createImageStyle(size, finalBorderRadius, style)} // Use function from styles
			cacheKey={`${uri}-${size}x${size}`}
			onLoadStart={handleLoadStart}
			onLoadEnd={handleLoadEnd}
			onError={handleError}
			testID={testID}
			tintColor={tintColor || undefined}
		/>
	);
};

// Removed old PLACEHOLDER_COLOR and placeholderStyles StyleSheet.create block

export default CachedImage;

