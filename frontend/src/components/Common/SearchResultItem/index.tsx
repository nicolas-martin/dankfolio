import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import { TokenImage } from '@/components/Common/TokenImage';
import { SearchResultItemProps } from './types';
import { truncateAddress } from './scripts';
import { createStyles } from './styles';

const SearchResultItem: React.FC<SearchResultItemProps> = ({
	coin,
	onPress,
	isEnriched = true,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	return (
		<TouchableOpacity
			style={styles.container}
			onPress={() => onPress?.(coin)}
			disabled={!onPress}
		>
			<View style={styles.tokenInfo}>
				<TokenImage uri={coin.iconUrl} size={36} />
				<View style={styles.tokenDetails}>
					<Text style={styles.tokenName}>{coin.name || 'Unknown'}</Text>
					<Text style={styles.tokenAddress}>{truncateAddress(coin.mintAddress)}</Text>
				</View>
			</View>
			<View style={styles.symbolColumn}>
				<Text style={styles.tokenSymbol}>{coin.symbol || truncateAddress(coin.mintAddress)}</Text>
			</View>
			{!isEnriched && (
				<View style={styles.unenrichedBadge}>
					<Text style={styles.unenrichedText}>Unenriched</Text>
				</View>
			)}
		</TouchableOpacity>
	);
};

export default SearchResultItem; 