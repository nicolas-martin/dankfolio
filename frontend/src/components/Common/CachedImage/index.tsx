import React, { useState, useCallback } from 'react';
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

	const handleError = useCallback((error: any) => {
		console.warn('[CachedImage] ❌ Load Error:', uri, error);
	}, [uri]);

	// Default to circular if no borderRadius is provided
	const finalBorderRadius = borderRadius !== undefined ? borderRadius : size / 2;

	if (!uri) {
		return (
			<View 
				style={[
					placeholderStyles.placeholder, 
					{ 
						width: size, 
						height: size, 
						borderRadius: finalBorderRadius 
					}
				]} 
			/>
		);
	}

	return (
		<ExpoCachedImage
			source={{ uri }}
			style={[
				{ 
					width: size, 
					height: size, 
					borderRadius: finalBorderRadius 
				}, 
				style
			]}
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

