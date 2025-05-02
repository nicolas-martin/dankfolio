import React from 'react';
import { Image, ActivityIndicator, View } from 'react-native';
import { useProxiedImage } from '@/hooks/useProxiedImage';
import { TokenImageProps } from './types';
import { styles } from './styles';

export const TokenImage: React.FC<TokenImageProps> = ({ uri, size = 40 }) => {
	const { imageUri, isLoading } = useProxiedImage(uri);

	if (isLoading || !imageUri) {
		return (
			<View style={[styles.image, { width: size, height: size, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	return (
		<Image
			source={{ uri: imageUri }}
			style={[styles.image, { width: size, height: size }]}
		/>
	);
}; 