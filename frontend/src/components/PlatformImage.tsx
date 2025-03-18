import React from 'react';
import { Image, ImageProps, Platform } from 'react-native';

interface PlatformImageProps extends ImageProps {
    priority?: 'low' | 'normal' | 'high';
}

const PlatformImage: React.FC<PlatformImageProps> = ({ priority, ...props }) => {
    if (Platform.OS === 'web') {
        return <Image {...props} />;
    }

    // For native platforms
    const FastImage = require('react-native-fast-image').default;
    const fastImagePriority = priority ? FastImage.priority[priority] : FastImage.priority.normal;

    return (
        <FastImage
            {...props}
            priority={fastImagePriority}
            resizeMode={
                props.resizeMode
                    ? FastImage.resizeMode[props.resizeMode as keyof typeof FastImage.resizeMode] || FastImage.resizeMode.contain
                    : FastImage.resizeMode.contain
            }
        />
    );
};

export default PlatformImage; 