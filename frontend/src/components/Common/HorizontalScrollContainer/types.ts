import { ReactElement } from 'react';
import { StyleProp, ViewStyle } from 'react-native';

export interface HorizontalScrollContainerProps<T> {
	data: T[];
	renderItem: (item: T, index: number) => ReactElement;
	cardWidth: number;
	cardMargin: number;
	isLoading: boolean;
	placeholderCount?: number;
	renderPlaceholder: (index: number) => ReactElement;
	contentPadding?: {
		paddingLeft?: number;
		paddingRight?: number;
	};
	containerStyle?: StyleProp<ViewStyle>;
	testIdPrefix?: string;
	keyExtractor?: (item: T, index: number) => string;
	onItemPress?: (item: T) => void;
} 