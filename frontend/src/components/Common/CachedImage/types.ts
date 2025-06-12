import { ImageProps } from 'expo-image';
import { ImageStyle } from 'react-native';

export interface CachedImageProps extends Omit<ImageProps, 'source' | 'style'> {
	uri: string;
	size?: number;
	borderRadius?: number;
	fallbackText?: string;
	showLoadingIndicator?: boolean;
	style?: ImageStyle;
	testID?: string;
	blurhash?: string;
	placeholder?: ImageProps['placeholder'];
	expiresIn?: number;
} 
