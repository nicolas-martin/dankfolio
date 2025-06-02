import React from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';

interface ArrowsAnimationProps {
	autoPlay?: boolean;
	loop?: boolean;
	style?: StyleProp<ViewStyle>;
	size?: number;
	onAnimationFinish?: () => void;
	// Future props could include color, direction if the Lottie file supports it via expressions
}

const ArrowsAnimation: React.FC<ArrowsAnimationProps> = ({
	autoPlay = true,
	loop = true,
	style,
	size = 100,
	onAnimationFinish,
}) => {
	return (
		<LottieView
			source={require('@assets/lottie/trading_arrows.json')}
			autoPlay={autoPlay}
			loop={loop}
			style={[{ width: size, height: size }, style]}
			onAnimationFinish={onAnimationFinish}
		/>
	);
};

export default ArrowsAnimation;
