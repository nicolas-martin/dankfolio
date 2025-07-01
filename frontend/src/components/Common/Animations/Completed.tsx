import React, { useMemo } from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
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
	const lottieStyle = useMemo(() => {
		return [{ width: size, height: size }, style].filter(Boolean);
	}, [size, style]);

	return (
		<LottieView
			source={animationData} // Use the imported data
			autoPlay={autoPlay}
			loop={loop}
			style={lottieStyle} // Use memoized style
			onAnimationFinish={onAnimationFinish}
		/>
	);
};

export default Completed;
