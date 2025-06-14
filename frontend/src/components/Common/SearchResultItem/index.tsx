import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SearchResultItemProps } from './types';
import { formatAddress } from '@/utils/numberFormat';
import { useStyles } from './styles';
import CoinInfoBlock from 'components/Common/CoinInfoBlock/CoinInfoBlock';

const SearchResultItem: React.FC<SearchResultItemProps> = ({
	coin,
	onPress,
	isEnriched = true,
}) => {
	const styles = useStyles();
	if (!coin || !coin.resolvedIconUrl) {
		return null;
	}

	// Simple formatter for now
	const formatJupiterListedAt = (date?: Date): string | null => {
		if (!date) return null;
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
				primaryTextStyle={styles.tokenName}
				secondaryTextStyle={styles.tokenAddress}
			/>
			{listedAtString && (
				<View style={styles.tokenDetails}>
					<Text style={styles.listedAtText}>{listedAtString}</Text>
				</View>
			)}
			<View style={styles.symbolColumn}>
				<Text style={styles.tokenSymbol}>{coin.symbol || formatAddress(coin.mintAddress, 6, 6)}</Text>
			</View>
			{!isEnriched && (
				<View style={styles.unenrichedBadge}>
					<Text style={styles.unenrichedText}>Unenriched</Text>
				</View>
			)}
		</TouchableOpacity>
	);
};

export default React.memo(SearchResultItem);
