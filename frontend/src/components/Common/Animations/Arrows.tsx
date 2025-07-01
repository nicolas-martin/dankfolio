import React, { useMemo } from 'react'; // Add useMemo
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';
import animationData from '@assets/lottie/trading_arrows.json'; // Import the JSON file

interface ArrowsAnimationProps {
	autoPlay?: boolean;
	loop?: boolean;
	style?: StyleProp<ViewStyle>;
	size?: number;
	onAnimationFinish?: () => void;
	// Future props could include color, direction if the Lottie file supports it via expressions
}

const Arrows: React.FC<ArrowsAnimationProps> = ({
	autoPlay = true,
	loop = true,
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

export default Arrows;
