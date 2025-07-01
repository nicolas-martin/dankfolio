import React, { useMemo } from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';
import animationData from '@assets/lottie/loading_spinner.json';

interface LoadingAnimationProps {
	autoPlay?: boolean;
	loop?: boolean;
	style?: StyleProp<ViewStyle>;
	size?: number;
	onAnimationFinish?: () => void;
}

const Loading: React.FC<LoadingAnimationProps> = ({
	autoPlay = true,
	loop = true,
	style,
	size = 50, // Default size updated to 50
	onAnimationFinish,
}) => {
	const theme = useTheme() as AppTheme;
	
	const lottieStyle = useMemo(() => {
		return [{ width: size, height: size }, style].filter(Boolean);
	}, [size, style]);

	const colorFilters = useMemo(() => [
		{
			keypath: "Shape Layer 3", // First dot
			color: theme.colors.primary, // Theme primary color
		},
		{
			keypath: "Shape Layer 2", // Second dot
			color: theme.colors.primary, // Theme primary color
		},
		{
			keypath: "Shape Layer 1", // Third dot
			color: theme.colors.primary, // Theme primary color
		},
		{
			keypath: "Shape Layer 4", // Fourth dot
			color: theme.colors.primary, // Theme primary color
		},
		{
			keypath: "Shape Layer 5", // Fifth dot
			color: theme.colors.primary, // Theme primary color
		},
		{
			keypath: "Ellipse 1", // Individual ellipse shapes
			color: theme.colors.primary, // Theme primary color
		},
		{
			keypath: "Fill 1", // Fill elements
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

export default Loading;
