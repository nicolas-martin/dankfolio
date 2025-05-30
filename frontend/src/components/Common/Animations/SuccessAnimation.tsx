import React from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';

import successAnimationSource from '../../../../assets/lottie/success_tick.json';

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
			source={successAnimationSource}
			autoPlay={autoPlay}
			loop={loop}
			style={[{ width: size, height: size }, style]}
			onAnimationFinish={onAnimationFinish}
		/>
	);
};

export default SuccessAnimation;
