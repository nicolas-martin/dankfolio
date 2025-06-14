import React, { useState, useCallback, useMemo } from 'react'; // Add useMemo
import { View, StyleSheet } from 'react-native';
import ExpoCachedImage from 'expo-cached-image';
import { CachedImageProps } from './types';
import { logCacheResult } from './scripts';

const CachedImage: React.FC<CachedImageProps> = ({
	uri,
	size = 50,
	borderRadius,
	style,
	placeholder,
	testID,
	tintColor,
}) => {
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
		console.warn('[CachedImage] ❌ Load Error:', uri, error);
	}, [uri]);

	// Default to circular if no borderRadius is provided
	const finalBorderRadius = borderRadius !== undefined ? borderRadius : size / 2;

	const placeholderStyle = useMemo(() => [
		placeholderStyles.placeholder,
		{
			width: size,
			height: size,
			borderRadius: finalBorderRadius
		}
	], [size, finalBorderRadius, placeholderStyles.placeholder]);

	if (!uri) {
		return (
			<View
				style={placeholderStyle} // Use memoized style
			/>
		);
	}

	const imageSource = useMemo(() => ({ uri }), [uri]);
	const imageStyle = useMemo(() => [
		{
			width: size,
			height: size,
			borderRadius: finalBorderRadius
		},
		style
	].filter(Boolean), [size, finalBorderRadius, style]);

	return (
		<ExpoCachedImage
			source={imageSource} // Use memoized source
			style={imageStyle} // Use memoized style
			cacheKey={`${uri}-${size}x${size}`}
			onLoadStart={handleLoadStart}
			onLoadEnd={handleLoadEnd}
			onError={handleError}
			testID={testID}
			tintColor={tintColor || undefined}
		/>
	);
};

const PLACEHOLDER_COLOR = '#f0f0f0';

const placeholderStyles = StyleSheet.create({
	placeholder: {
		backgroundColor: PLACEHOLDER_COLOR,
	},
});

export default CachedImage; 

