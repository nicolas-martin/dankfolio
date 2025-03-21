import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { CommonProps } from './types';
import { styles } from './styles';
import { getImageSource, getContainerStyles, getImageStyles } from './scripts';

const DEFAULT_TOKEN_ICON = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

const PlatformImage: React.FC<CommonProps> = (props) => {
  const [hasError, setHasError] = useState(false);

  // If it's a local image (number type), use it directly
  if (typeof props.source === 'number') {
    return (
      <View style={getContainerStyles(props.style)}>
        <Image 
          {...props}
          accessible={true}
          accessibilityLabel={props.alt}
          style={getImageStyles(props.style)}
        />
      </View>
    );
  }

  // For remote images, handle errors and show fallback
  return (
    <View style={getContainerStyles(props.style)}>
      <Image 
        {...props}
        source={getImageSource(props.source, hasError)}
        accessible={true}
        accessibilityLabel={props.alt}
        onError={() => setHasError(true)}
        style={getImageStyles(props.style)}
      />
    </View>
  );
};

export default PlatformImage; 