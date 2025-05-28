import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';
import { CachedImage } from '@/components/Common/CachedImage';

interface ImageComparisonProps {
	uri: string;
	size?: number;
}

export const ImageComparison: React.FC<ImageComparisonProps> = ({ 
	uri, 
	size = 40 
}) => {
	const DEFAULT_TOKEN_IMAGE = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
	const blurhash = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

	return (
		<View style={{ flexDirection: 'row', gap: 20, padding: 20 }}>
			<View style={{ alignItems: 'center' }}>
				<Text style={{ marginBottom: 10, fontSize: 12 }}>CachedImage</Text>
				<CachedImage
					uri={uri}
					size={size}
					borderRadius={size / 2}
					blurhash={blurhash}
				/>
			</View>
			
			<View style={{ alignItems: 'center' }}>
				<Text style={{ marginBottom: 10, fontSize: 12 }}>Expo Image</Text>
				<Image
					source={{ uri: uri || DEFAULT_TOKEN_IMAGE }}
					style={{ 
						width: size, 
						height: size, 
						borderRadius: size / 2 
					}}
					contentFit="cover"
					transition={300}
					cachePolicy="disk"
					placeholder={{ blurhash }}
				/>
			</View>
		</View>
	);
}; 