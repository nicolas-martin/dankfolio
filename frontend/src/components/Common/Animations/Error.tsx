import React, { useMemo } from 'react'; // Add useMemo
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
import animationData from '@assets/lottie/error_cross.json'; // Import the JSON file

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

export default Error;
