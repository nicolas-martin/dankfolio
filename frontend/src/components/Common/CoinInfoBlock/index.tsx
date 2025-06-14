import React, { useMemo } from 'react'; // Add useMemo
import { View } from 'react-native';
import { Text } from 'react-native-paper'; // Assuming use of react-native-paper Text
import { useStyles } from './CoinInfoBlock.styles';
import CachedImage from '../CachedImage'; // Assuming CachedImage is in the same Common directory

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

    const viewStyle = useMemo(() => [
        styles.container,
        containerStyle
    ].filter(Boolean), [styles.container, containerStyle]);

    const finalIconStyle = useMemo(() => [
        styles.icon,
        iconStyle
    ].filter(Boolean), [styles.icon, iconStyle]);

    const textContainerViewStyle = useMemo(() => [
        styles.textContainer,
        textContainerStyle,
        !iconUri ? styles.noIconMargin : undefined
    ].filter(Boolean), [styles.textContainer, textContainerStyle, iconUri, styles.noIconMargin]);

    const finalPrimaryTextStyle = useMemo(() => [
        styles.primaryText,
        primaryTextStyle
    ].filter(Boolean), [styles.primaryText, primaryTextStyle]);

    const finalSecondaryTextStyle = useMemo(() => [
        styles.secondaryText,
        secondaryTextStyle
    ].filter(Boolean), [styles.secondaryText, secondaryTextStyle]);

    return (
        <View style={viewStyle}>
            {iconUri && (
                <CachedImage
                    uri={iconUri}
                    size={iconSize}
                    style={finalIconStyle}
                    showLoadingIndicator={true} // Default, can be made a prop
                    borderRadius={iconSize / 2} // Default to circular
                />
            )}
            <View style={textContainerViewStyle}>
                <Text style={finalPrimaryTextStyle} numberOfLines={1} ellipsizeMode="tail">
                    {primaryText}
                </Text>
                {secondaryText && (
                    <Text style={finalSecondaryTextStyle} numberOfLines={1} ellipsizeMode="tail">
                        {secondaryText}
                    </Text>
                )}
            </View>
        </View>
    );
};

export default CoinInfoBlock;
