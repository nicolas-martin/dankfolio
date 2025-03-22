import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { CommonProps } from './types';
import { getImageSource, getContainerStyles, getImageStyles } from './scripts';

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