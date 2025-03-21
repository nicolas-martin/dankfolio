import React, { useState } from 'react';
import { Image, View, Animated } from 'react-native';
import { CommonProps } from './types';
import { styles } from './styles';

const DEFAULT_TOKEN_ICON = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

const PlatformImage: React.FC<CommonProps> = (props) => {
  const [hasError, setHasError] = useState(false);
  const [opacity] = useState(new Animated.Value(0));

  const onLoad = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // If it's a local image (number type), use it directly
  if (typeof props.source === 'number') {
    return (
      <View style={[styles.container, props.style]}>
        <Animated.View style={{ opacity }}>
          <Image 
            {...props}
            accessible={true}
            accessibilityLabel={props.alt}
            onLoad={onLoad}
            style={[styles.image, props.style]}
          />
        </Animated.View>
      </View>
    );
  }

  // For remote images, handle errors and show fallback
  return (
    <View style={[styles.container, props.style]}>
      <Animated.View style={{ opacity }}>
        <Image 
          {...props}
          source={hasError ? { uri: DEFAULT_TOKEN_ICON } : props.source}
          accessible={true}
          accessibilityLabel={props.alt}
          onLoadStart={() => opacity.setValue(0)}
          onLoad={onLoad}
          onError={() => setHasError(true)}
          style={[styles.image, props.style]}
        />
      </Animated.View>
    </View>
  );
};

export default PlatformImage; 