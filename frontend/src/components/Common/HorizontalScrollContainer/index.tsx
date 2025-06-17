import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { HorizontalScrollContainerProps } from './types';
import { useStyles } from './styles';

const HorizontalScrollContainer = <T,>({
	data,
	renderItem,
	cardWidth,
	cardMargin,
	isLoading,
	placeholderCount = 4,
	renderPlaceholder,
	contentPadding,
	containerStyle,
	testIdPrefix = 'horizontal-scroll',
	keyExtractor,
	onItemPress,
}: HorizontalScrollContainerProps<T>) => {
	const styles = useStyles();

	// Calculate snap interval for smooth scrolling
	const snapInterval = cardWidth + cardMargin;

	// Memoize placeholder data
	const placeholderData = useMemo(
		() => Array.from({ length: placeholderCount }, (_, index) => index),
		[placeholderCount]
	);

	// Default key extractor
	const defaultKeyExtractor = useCallback(
		(item: T, index: number) => {
			if (keyExtractor) {
				return keyExtractor(item, index);
			}
			// Fallback: try to use common properties or index
			if (typeof item === 'object' && item !== null) {
				const obj = item as any;
				return obj.address || obj.id || obj.symbol || `item-${index}`;
			}
			return `item-${index}`;
		},
		[keyExtractor]
	);

	// Item layout for performance optimization
	const getItemLayout = useCallback(
		(_data: T[] | null, index: number) => ({
			length: snapInterval,
			offset: snapInterval * index,
			index,
		}),
		[snapInterval]
	);

	// Render item wrapper
	const renderItemWrapper = useCallback(
		({ item, index }: { item: T; index: number }) => {
			return renderItem(item, index);
		},
		[renderItem]
	);

	// Render placeholder wrapper
	const renderPlaceholderWrapper = useCallback(
		({ index }: { index: number }) => {
			return renderPlaceholder(index);
		},
		[renderPlaceholder]
	);

	// Content container style with padding
	const listContentContainerStyle = useMemo(
		() => [
			styles.listContentContainer,
			contentPadding && {
				paddingLeft: contentPadding.paddingLeft,
				paddingRight: contentPadding.paddingRight,
			},
		],
		[styles.listContentContainer, contentPadding]
	);

	// Show loading state
	if (isLoading && data.length === 0) {
		return (
			<View style={[styles.container, containerStyle]}>
				<Animated.FlatList
					data={placeholderData}
					renderItem={renderPlaceholderWrapper}
					keyExtractor={(_, index) => `${testIdPrefix}-placeholder-${index}`}
					horizontal
					showsHorizontalScrollIndicator={false}
					contentContainerStyle={listContentContainerStyle}
					scrollEnabled={false} // Disable scrolling for placeholders
					testID={`${testIdPrefix}-loading-list`}
				/>
			</View>
		);
	}

	// Show empty state or actual data
	return (
		<View style={[styles.container, containerStyle]}>
			<Animated.FlatList
				data={data}
				renderItem={renderItemWrapper}
				keyExtractor={defaultKeyExtractor}
				horizontal
				showsHorizontalScrollIndicator={false}
				contentContainerStyle={listContentContainerStyle}
				scrollEnabled={true}
				scrollEventThrottle={1}
				decelerationRate="fast"
				snapToInterval={snapInterval}
				snapToAlignment="start"
				maxToRenderPerBatch={3}
				updateCellsBatchingPeriod={50}
				initialNumToRender={5}
				windowSize={5}
				getItemLayout={getItemLayout}
				testID={`${testIdPrefix}-list`}
			/>
		</View>
	);
};

export default React.memo(HorizontalScrollContainer) as <T>(
	props: HorizontalScrollContainerProps<T>
) => React.ReactElement; 