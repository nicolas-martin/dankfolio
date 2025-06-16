import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { useStyles } from './CoinInfoBlock.styles';
import CachedImage from '@/components/Common/CachedImage';

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
	// Add testID prefix support for generating testIDs
	testIdPrefix?: string;
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
	testIdPrefix,
}) => {
	const styles = useStyles();

	// Generate testIDs automatically using the symbol (primaryText)
	const symbolLower = primaryText.toLowerCase();
	const iconTestID = testIdPrefix ? `${testIdPrefix}-icon-${symbolLower}` : undefined;
	const symbolTestID = testIdPrefix ? `${testIdPrefix}-symbol-${symbolLower}` : undefined;

	return (
		<View style={styles.createViewStyle(containerStyle)}>
			{iconUri && (
				<View style={styles.createIconStyle(iconStyle)}>
					<CachedImage
						uri={iconUri}
						size={iconSize}
						showLoadingIndicator={true} // Default, can be made a prop
						borderRadius={iconSize / 2} // Default to circular
						testID={iconTestID}
					/>
				</View>
			)}
			<View style={styles.createTextContainerStyle(textContainerStyle, iconUri)}>
				<Text 
					style={styles.createPrimaryTextStyle(primaryTextStyle)} 
					numberOfLines={1} 
					ellipsizeMode="tail"
					testID={symbolTestID}
				>
					{primaryText}
				</Text>
				{secondaryText && (
					<Text 
						style={styles.createSecondaryTextStyle(secondaryTextStyle)} 
						numberOfLines={1} 
						ellipsizeMode="tail"
					>
						{secondaryText}
					</Text>
				)}
			</View>
		</View>
	);
};

export default CoinInfoBlock;
