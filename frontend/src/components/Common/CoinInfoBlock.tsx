import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper'; // Assuming use of react-native-paper Text
import { useStyles } from './CoinInfoBlock.styles';
import CachedImage from './CachedImage'; // Assuming CachedImage is in the same Common directory

interface CoinInfoBlockProps {
  iconUri?: string;
  iconSize?: number;
  primaryText: string;
  secondaryText?: string;
  // Allow passing custom styles for text elements if needed
  primaryTextStyle?: object;
  secondaryTextStyle?: object;
  containerStyle?: object;
  iconStyle?: object;
  textContainerStyle?: object;
}

const CoinInfoBlock: React.FC<CoinInfoBlockProps> = ({
  iconUri,
  iconSize = 36, // Default icon size
  primaryText,
  secondaryText,
  primaryTextStyle,
  secondaryTextStyle,
  containerStyle,
  iconStyle,
  textContainerStyle,
}) => {
  const styles = useStyles();

  return (
    <View style={[styles.container, containerStyle]}>
      {iconUri && (
        <CachedImage
          uri={iconUri}
          size={iconSize}
          style={[styles.icon, iconStyle]}
          showLoadingIndicator={true} // Default, can be made a prop
          borderRadius={iconSize / 2} // Default to circular
        />
      )}
      <View style={[styles.textContainer, textContainerStyle, !iconUri && { marginLeft: 0 }]}>
        <Text style={[styles.primaryText, primaryTextStyle]} numberOfLines={1} ellipsizeMode="tail">
          {primaryText}
        </Text>
        {secondaryText && (
          <Text style={[styles.secondaryText, secondaryTextStyle]} numberOfLines={1} ellipsizeMode="tail">
            {secondaryText}
          </Text>
        )}
      </View>
    </View>
  );
};

export default CoinInfoBlock;
