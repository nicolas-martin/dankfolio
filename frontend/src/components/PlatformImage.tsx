import React from 'react';
import { Platform, Image } from 'react-native';

type CommonProps = {
    source: { uri: string };
    style?: any;
    resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
};

const PlatformImage: React.FC<CommonProps> = (props) => {
    if (Platform.OS === 'web') {
        return <Image {...props} />;
    }

    // For native platforms, try to load FastImage
    let FastImage: any;
    try {
        FastImage = require('react-native-fast-image').default;
    } catch (error) {
        console.warn('Failed to load react-native-fast-image:', error);
        return <Image {...props} />;
    }

    // Make sure FastImage is properly loaded
    if (!FastImage || typeof FastImage !== 'object') {
        console.warn('react-native-fast-image is not properly initialized');
        return <Image {...props} />;
    }

    // Convert resizeMode to FastImage format
    const fastImageResizeMode = {
        'contain': FastImage.resizeMode.contain,
        'cover': FastImage.resizeMode.cover,
        'stretch': FastImage.resizeMode.stretch,
        'center': FastImage.resizeMode.center,
    }[props.resizeMode || 'contain'];

    return (
        <FastImage
            source={props.source}
            style={props.style}
            resizeMode={fastImageResizeMode}
        />
    );
};

export default PlatformImage;

