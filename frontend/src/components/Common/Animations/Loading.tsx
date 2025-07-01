import React, { useMemo } from 'react'; // Add useMemo
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
import animationData from '@assets/lottie/loading_spinner.json'; // Import the JSON file

// Assuming loading_spinner.json will be downloaded by the user into frontend/assets/lottie/

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

export default Loading;
