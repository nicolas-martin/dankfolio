import { ImageSourcePropType, ViewStyle, ImageStyle } from 'react-native';

export const DEFAULT_TOKEN_ICON = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

export const getImageSource = (source: ImageSourcePropType, hasError: boolean): ImageSourcePropType => {
  if (hasError) {
    return { uri: DEFAULT_TOKEN_ICON };
  }
  return source;
};

export const getContainerStyles = (style?: ViewStyle | ImageStyle): ViewStyle[] => {
  return [{ overflow: 'hidden' }, style as ViewStyle];
};

export const getImageStyles = (style?: ViewStyle | ImageStyle): ImageStyle[] => {
  return [{ width: '100%', height: '100%', resizeMode: 'contain' }, style as ImageStyle];
}; 