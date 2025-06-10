import React from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
import animationData from '@assets/lottie/success_tick.json'; // Import the JSON file

interface SuccessAnimationProps {
	autoPlay?: boolean;
	loop?: boolean;
	style?: StyleProp<ViewStyle>;
	size?: number;
	onAnimationFinish?: () => void;
}

const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
	autoPlay = true,
	loop = false, // Typically, success animations don't loop
	style,
	size = 100,
	onAnimationFinish,
}) => {
	return (
		<LottieView
			source={animationData} // Use the imported data
			autoPlay={autoPlay}
			loop={loop}
			style={[{ width: size, height: size }, style]}
			onAnimationFinish={onAnimationFinish}
		/>
	);
};

export default SuccessAnimation;
