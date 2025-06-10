import React, { useEffect } from 'react';
import { View, ViewStyle, DimensionValue } from 'react-native';
import { useTheme } from 'react-native-paper';
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
	const theme = useTheme();
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

	return (
		<View
			style={[
				styles.shimmerContainer,
				style,
			]}
		>
			<Animated.View
				style={[
					styles.animatedShimmerOverlay,
					animatedStyle,
				]}
			/>
		</View>
	);
};

const createStyles = (theme: ReturnType<typeof useTheme>, width: DimensionValue, height: number, borderRadius: number) => StyleSheet.create({
	shimmerContainer: {
		width,
		height,
		borderRadius,
		backgroundColor: theme.colors.surfaceVariant,
		overflow: 'hidden',
	},
	animatedShimmerOverlay: {
		width: '100%',
		height: '100%',
		backgroundColor: theme.colors.surface,
	},
});

export default ShimmerPlaceholder; 