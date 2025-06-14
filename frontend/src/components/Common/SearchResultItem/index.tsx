import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
// import CachedImage from '@/components/Common/CachedImage'; // No longer directly used
import { SearchResultItemProps } from './types';
import { formatAddress } from '@/utils/numberFormat';
import { useStyles } from './styles';
import CoinInfoBlock from '@/components/Common/CoinInfoBlock'; // Import CoinInfoBlock

const SearchResultItem: React.FC<SearchResultItemProps> = ({
	coin,
	onPress,
	isEnriched = true,
}) => {
	const styles = useStyles();
	if (!coin || !coin.resolvedIconUrl) {
		return null; // Early return if coin data is not available
	}

	// Simple formatter for now
	const formatJupiterListedAt = (date?: Date): string | null => {
		if (!date) return null;
		// Example: "Listed: 3/15/2024" - can be improved later
		return `Listed: ${date.toLocaleDateString()}`;
	};

	const listedAtString = formatJupiterListedAt(coin.jupiterListedAt);

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={() => onPress?.(coin)}
			disabled={!onPress}
		>
			<CoinInfoBlock
				iconUri={coin.resolvedIconUrl}
				iconSize={36}
				primaryText={coin.name}
				secondaryText={formatAddress(coin.mintAddress, 6, 6)}
				// Pass styles if CoinInfoBlock's defaults aren't sufficient or if SearchResultItem has specific layout needs for this block
				// containerStyle={styles.tokenInfoContainer} // Example: if styles.tokenInfo was the container
				primaryTextStyle={styles.tokenName}
				secondaryTextStyle={styles.tokenAddress}
			// textContainerStyle={styles.tokenDetails} // This was the View wrapping texts
			/>{/* No space or newline here if possible */}
			{/* Original listedAtString needs to be placed. Maybe CoinInfoBlock needs a third line or additional slot? */}
			{/* For now, let's add it separately if CoinInfoBlock doesn't support it. */}
			{listedAtString && (
				<View style={styles.tokenDetails}>
					<Text style={styles.listedAtText}>{listedAtString}</Text>
				</View>
			)}{/* No space or newline here if possible */}
			<View style={styles.symbolColumn}>
				<Text style={styles.tokenSymbol}>{coin.symbol || formatAddress(coin.mintAddress, 6, 6)}</Text>
			</View>{/* No space or newline here if possible */}
			{!isEnriched && (
				<View style={styles.unenrichedBadge}>
					<Text style={styles.unenrichedText}>Unenriched</Text>
				</View>
			)}
		</TouchableOpacity>
	);
};

export default React.memo(SearchResultItem);
