import React, { useMemo } from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';
import animationData from '@assets/lottie/completed.json';

interface CompletedAnimationProps {
	autoPlay?: boolean;
	loop?: boolean;
	style?: StyleProp<ViewStyle>;
	size?: number;
	onAnimationFinish?: () => void;
}

const Completed: React.FC<CompletedAnimationProps> = ({
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
			color: theme.colors.onPrimary, // White or contrasting color
		},
		{
			keypath: "circle - stroke", // The animated circle border
			color: theme.colors.primary, // Theme primary color (neon green)
		},
		{
			keypath: "circle - bg", // The circle background/fill
			color: theme.colors.primary, // Theme primary color (neon green)
		},
		{
			keypath: "burst", // The success burst effect
			color: theme.colors.primary, // Theme primary color (neon green)
		},
		{
			keypath: "burst 2", // The second burst effect
			color: theme.colors.primary, // Theme primary color (neon green)
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

export default Completed;
