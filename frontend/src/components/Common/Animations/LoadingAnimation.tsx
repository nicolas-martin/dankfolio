import React from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
import { useTheme } from 'react-native-paper';

// Assuming loading_spinner.json will be downloaded by the user into frontend/assets/lottie/

interface LoadingAnimationProps {
	autoPlay?: boolean;
	loop?: boolean;
	style?: StyleProp<ViewStyle>;
	size?: number;
	onAnimationFinish?: () => void;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({
	autoPlay = true,
	loop = true,
	style,
	size = 100, // Default size
	onAnimationFinish,
}) => {
	return (
		<LottieView
			source={require('@assets/lottie/loading_spinner.json')}
			autoPlay={autoPlay}
			loop={loop}
			style={[{ width: size, height: size }, style]}
			onAnimationFinish={onAnimationFinish}
		/>
	);
};

export default LoadingAnimation;
