import React, { useMemo } from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';
import animationData from '@assets/lottie/success_tick.json';

interface SuccessAnimationProps {
	autoPlay?: boolean;
	loop?: boolean;
	style?: StyleProp<ViewStyle>;
	size?: number;
	onAnimationFinish?: () => void;
}

const Success: React.FC<SuccessAnimationProps> = ({
	autoPlay = true,
	loop = false, // Typically, success animations don't loop
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
			keypath: "check", // The checkmark stroke
			color: theme.colors.onPrimary, // Use onPrimary which is white
		},
		{
			keypath: "Shape Layer 2", // The main success circle background
			color: theme.success, // Theme success color (green)
		},
		{
			keypath: "Shape Layer 1", // Secondary circle/stroke
			color: theme.success, // Theme success color
		},
		{
			keypath: "Ellipse 1", // Circle elements
			color: theme.success, // Theme success color
		},
		{
			keypath: "Fill 1", // Fill elements
			color: theme.success, // Theme success color
		},
		{
			keypath: "Stroke 1", // Stroke elements
			color: theme.colors.onPrimary, // Use onPrimary which is white
		},
		{
			keypath: "BG", // Background layer
			color: theme.colors.surface, // Theme surface color
		},
	], [theme.colors, theme.success]);

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

export default Success;
