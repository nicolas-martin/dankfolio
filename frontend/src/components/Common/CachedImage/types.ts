import { ImageProps } from 'expo-image';
import { ImageStyle } from 'react-native';

export interface CachedImageProps extends Omit<ImageProps, 'source' | 'style'> {
	uri?: string;
	size?: number;
	style?: ImageStyle;
	fallbackUri?: string;
	showLoadingIndicator?: boolean;
	borderRadius?: number;
	cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
	priority?: 'low' | 'normal' | 'high';
} 