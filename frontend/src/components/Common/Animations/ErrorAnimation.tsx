import React from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';

interface ErrorAnimationProps {
	autoPlay?: boolean;
	loop?: boolean;
	style?: StyleProp<ViewStyle>;
	size?: number;
	onAnimationFinish?: () => void;
}

const ErrorAnimation: React.FC<ErrorAnimationProps> = ({
	autoPlay = true,
	loop = false, // Typically, error animations don't loop
	style,
	size = 100,
	onAnimationFinish,
}) => {
	return (
		<LottieView
			source={require('@assets/lottie/error_cross.json')}
			autoPlay={autoPlay}
			loop={loop}
			style={[{ width: size, height: size }, style]}
			onAnimationFinish={onAnimationFinish}
		/>
	);
};

export default ErrorAnimation;
