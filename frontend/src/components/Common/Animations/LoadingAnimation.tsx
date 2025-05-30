import React from 'react';
import LottieView from 'lottie-react-native';
import { ViewStyle, StyleProp } from 'react-native';

// Assuming loading_spinner.json will be downloaded by the user into frontend/assets/lottie/
const loadingAnimationSource = require('../../../../assets/lottie/loading_spinner.json');

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
      source={loadingAnimationSource}
      autoPlay={autoPlay}
      loop={loop}
      style={[{ width: size, height: size }, style]}
      onAnimationFinish={onAnimationFinish}
    />
  );
};

export default LoadingAnimation;
