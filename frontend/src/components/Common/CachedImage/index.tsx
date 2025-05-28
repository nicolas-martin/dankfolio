import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { CachedImageProps } from './types';
import { styles } from './styles';

// Default fallback image for tokens
const DEFAULT_TOKEN_IMAGE = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

export const CachedImage: React.FC<CachedImageProps> = ({
	uri,
	size = 40,
	style,
	fallbackUri = DEFAULT_TOKEN_IMAGE,
	showLoadingIndicator = true,
	borderRadius = 20,
	cachePolicy = 'disk', // Optimal for mobile - persists across app restarts
	priority = 'normal',
	...props
}) => {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [currentUri, setCurrentUri] = useState(uri || fallbackUri);

	// Reset state when URI changes
	useEffect(() => {
		if (uri !== currentUri) {
			setCurrentUri(uri || fallbackUri);
			setIsLoading(true);
			setHasError(false);
		}
	}, [uri, currentUri, fallbackUri]);

	const imageStyle = {
		width: size,
		height: size,
		borderRadius,
		...style,
	};

	const handleLoadStart = () => {
		setIsLoading(true);
		setHasError(false);
	};

	const handleLoad = () => {
		setIsLoading(false);
		setHasError(false);
	};

	const handleError = () => {
		setIsLoading(false);
		setHasError(true);
		
		// Try fallback if current URI failed and it's not already the fallback
		if (currentUri !== fallbackUri) {
			setCurrentUri(fallbackUri);
			setIsLoading(true);
			setHasError(false);
		}
	};

	if (isLoading && showLoadingIndicator) {
		return (
			<View style={[imageStyle, styles.loadingContainer]}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	return (
		<ExpoImage
			source={{ uri: currentUri }}
			style={imageStyle}
			onLoadStart={handleLoadStart}
			onLoad={handleLoad}
			onError={handleError}
			cachePolicy={cachePolicy} // Use disk caching for better performance
			priority={priority} // Normal priority for most images
			contentFit="cover" // Better than resizeMode for expo-image
			transition={200} // Smooth transition when loading
			{...props}
		/>
	);
}; 