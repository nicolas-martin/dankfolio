import React, { useMemo } from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';
import animationData from '@assets/lottie/trading_arrows.json';

interface ArrowsAnimationProps {
	autoPlay?: boolean;
	loop?: boolean;
	style?: StyleProp<ViewStyle>;
	size?: number;
	onAnimationFinish?: () => void;
	// Future props could include color, direction if the Lottie file supports it via expressions
}

const Arrows: React.FC<ArrowsAnimationProps> = ({
	autoPlay = true,
	loop = true,
	style,
	size = 100,
	onAnimationFinish,
}) => {
	const theme = useTheme() as AppTheme;
	
	const lottieStyle = useMemo(() => {
		return [{ width: size, height: size }, style].filter(Boolean);
	}, [size, style]);

	const colorFilters = useMemo(() => [
		{
			keypath: "Color", // Direct color property
			color: theme.colors.primary, // Theme primary color
		},
		{
			keypath: "Trazo", // Stroke/line elements (arrow lines)
			color: theme.colors.primary, // Theme primary color
		},
		{
			keypath: "Trazado", // Path elements (arrow shapes)
			color: theme.colors.primary, // Theme primary color
		},
		{
			keypath: "Comp 7", // Main composition layer
			color: theme.colors.primary, // Theme primary color
		},
	], [theme.colors]);

	return (
		<LottieView
			source={animationData}
			autoPlay={autoPlay}
			loop={loop}
			style={lottieStyle}
			onAnimationFinish={onAnimationFinish}
			colorFilters={colorFilters}
		/>
	);
};

export default Arrows;
