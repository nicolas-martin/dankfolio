import React, { useEffect, useMemo } from 'react'; // Ensure useMemo is imported
import { View, ViewStyle, DimensionValue, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '@/utils/theme'; // Add this line
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	interpolate,
} from 'react-native-reanimated';

interface ShimmerPlaceholderProps {
	width?: DimensionValue;
	height?: number;
	borderRadius?: number;
	style?: ViewStyle;
}

const ShimmerPlaceholder: React.FC<ShimmerPlaceholderProps> = ({
	width = '100%',
	height = 20,
	borderRadius = 4,
	style,
}) => {
	const theme = useTheme() as AppTheme;
	const styles = React.useMemo(() => createStyles(theme, width, height, borderRadius), [theme, width, height, borderRadius]);
	const shimmerValue = useSharedValue(0);

	useEffect(() => {
		shimmerValue.value = withRepeat(
			withTiming(1, { duration: 1500 }),
			-1,
			false
		);
	}, [shimmerValue]);

	const animatedStyle = useAnimatedStyle(() => {
		const opacity = interpolate(
			shimmerValue.value,
			[0, 0.5, 1],
			[0.3, 0.7, 0.3]
		);

		return {
			opacity,
		};
	});

	const viewStyle = useMemo(() => [
		styles.shimmerContainer,
		style
	].filter(Boolean), [styles.shimmerContainer, style]);

	const animatedViewStyle = useMemo(() => [
		styles.animatedShimmerOverlay,
		animatedStyle
	], [styles.animatedShimmerOverlay, animatedStyle]);

	return (
		<View style={viewStyle}>
			<Animated.View style={animatedViewStyle} />
		</View>
	);
};

const createStyles = (theme: AppTheme, width: DimensionValue, height: number, borderRadius: number) => StyleSheet.create({
	// eslint-disable-next-line react-native/no-unused-styles
	animatedShimmerOverlay: {
		backgroundColor: theme.colors.surface,
		height: '100%',
		width: '100%',
	},
	// eslint-disable-next-line react-native/no-unused-styles
	shimmerContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius,
		height,
		overflow: 'hidden',
		width,
	},
});

export default ShimmerPlaceholder; 
