import React, { useMemo } from 'react'; // Added useMemo
import { View, Text, StyleSheet } from 'react-native'; // Added StyleSheet
import { Image } from 'expo-image';
import CachedImage from '@/components/Common/CachedImage';

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
	const styles = useMemo(() => createImageComparisonStyles(size), [size]);

	const imageSource = useMemo(() => ({
		uri: uri || DEFAULT_TOKEN_IMAGE
	}), [uri, DEFAULT_TOKEN_IMAGE]);

	const imagePlaceholder = useMemo(() => ({
		blurhash
	}), [blurhash]);

	return (
		<View style={styles.outerContainer}>
			<View style={styles.imageContainer}>
				<Text style={styles.labelText}>CachedImage</Text>
				<CachedImage
					uri={uri}
					size={size}
					borderRadius={size / 2}
					blurhash={blurhash}
				/>
			</View>
			
			<View style={styles.imageContainer}>
				<Text style={styles.labelText}>Expo Image</Text>
				<Image
					source={imageSource} // Use memoized source
					style={styles.expoImage}
					contentFit="cover"
					transition={300}
					cachePolicy="disk"
					placeholder={imagePlaceholder} // Use memoized placeholder
				/>
			</View>
		</View>
	);
};

const createImageComparisonStyles = (size: number) => StyleSheet.create({
	// eslint-disable-next-line react-native/no-unused-styles
	expoImage: {
		borderRadius: size / 2,
		height: size,
		width: size,
	},
	// eslint-disable-next-line react-native/no-unused-styles
	imageContainer: {
		alignItems: 'center',
	},
	// eslint-disable-next-line react-native/no-unused-styles
	labelText: {
		fontSize: 12,
		marginBottom: 10,
	},
	// eslint-disable-next-line react-native/no-unused-styles
	outerContainer: {
		flexDirection: 'row',
		gap: 20,
		padding: 20,
	},
});