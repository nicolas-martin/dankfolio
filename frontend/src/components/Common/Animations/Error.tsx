import React, { useMemo } from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';
import animationData from '@assets/lottie/error_cross.json';

interface ErrorAnimationProps {
	autoPlay?: boolean;
	loop?: boolean;
	style?: StyleProp<ViewStyle>;
	size?: number;
	onAnimationFinish?: () => void;
}

const Error: React.FC<ErrorAnimationProps> = ({
	autoPlay = true,
	loop = false, // Typically, error animations don't loop
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
			keypath: "Combined Shape", // The X/cross shape
			color: theme.colors.onError, // White or contrasting color for visibility
		},
		{
			keypath: "Rectangle 6 Copy", // The background circle/rectangle
			color: theme.colors.error, // Theme error color (red)
		},
		{
			keypath: "Group 6", // Group container
			color: theme.colors.error, // Theme error color
		},
		{
			keypath: "Stroke 1", // Any stroke elements
			color: theme.colors.onError, // Contrasting color
		},
		{
			keypath: "Fill 1", // Any fill elements
			color: theme.colors.error, // Theme error color
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

export default Error;
