import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useCachedImage } from '@/hooks/useCachedImage';
import { TokenImageProps } from './types';
import { styles } from './styles';

export const TokenImage: React.FC<TokenImageProps> = ({ uri, size = 40 }) => {
	const { imageUri: cachedImageUri, isLoading: hookIsLoading, error: hookError } = useCachedImage(uri);
	const [isLoadingImage, setIsLoadingImage] = useState(true); // ExpoImage will update this
	const [imageError, setImageError] = useState<string | null>(null);

	const finalImageUri = cachedImageUri; // This is either original URI or DEFAULT_LOGO from the hook

	// Show ActivityIndicator if:
	// 1. The useCachedImage hook is still loading (determining if original URI is valid or if fallback is needed).
	// 2. ExpoImage is actively loading the finalImageUri.
	// 3. There's no finalImageUri (this should ideally be handled by useCachedImage providing a DEFAULT_LOGO, but acts as a safeguard).
	// This also implicitly covers showing ActivityIndicator if there's a hookError and no URI, or an imageError during ExpoImage's load.
	if (hookIsLoading || isLoadingImage || !finalImageUri) {
		// The loadingContainer style should center the ActivityIndicator within the image dimensions
		// We display ActivityIndicator even if there's an error (hookError or imageError) because
		// if finalImageUri is the DEFAULT_LOGO, ExpoImage might still be trying to load it.
		// If finalImageUri is null (which shouldn't happen if hook works correctly), spinner is shown.
		return (
			// <View style={[styles.image, styles.loadingContainer, { width: size, height: size }]}>
			<View style={[styles.image, { width: size, height: size }]}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	// Safeguard: If after all checks, finalImageUri is somehow still null (e.g., hook failed unexpectedly)
	// This is mostly defensive programming, as useCachedImage should always return a URI (original or default).
	if (!finalImageUri) {
		return (
			// <View style={[styles.image, styles.loadingContainer, { width: size, height: size }]}>
			<View style={[styles.image, { width: size, height: size }]}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	return (
		<ExpoImage
			source={{ uri: finalImageUri }}
			style={[styles.image, { width: size, height: size }]}
			cachePolicy="disk"
			transition={100}
			onLoadStart={() => {
				setIsLoadingImage(true);
				setImageError(null); // Reset error state when a new image load starts
			}}
			onLoadEnd={() => {
				setIsLoadingImage(false);
			}}
			onError={(event) => {
				setIsLoadingImage(false);
				const errorMessage = event.error || 'Failed to load image';
				setImageError(errorMessage);
				console.error('ExpoImage Error:', errorMessage, 'URI:', finalImageUri);
				// If the DEFAULT_LOGO itself fails to load, this will be logged.
				// The component will show nothing (or ExpoImage's placeholder if configured)
				// as ActivityIndicator won't be shown due to isLoadingImage being false.
				// A specific error UI could be added here if needed, by rendering something else if imageError is set.
			}}
		/>
	);
};

