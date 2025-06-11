import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from 'react-native-paper';
import CachedImage from '@/components/Common/CachedImage';
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
			<View style={styles.tokenInfo}>
				<CachedImage 
					uri={coin.resolvedIconUrl} 
					size={36} 
					borderRadius={18}
					showLoadingIndicator={true}
				/>
				<View style={styles.tokenDetails}>
					<Text style={styles.tokenName}>{coin.name || 'Unknown'}</Text>
					<Text style={styles.tokenAddress}>{truncateAddress(coin.mintAddress)}</Text>
					{listedAtString && ( // Only display if the date exists
						<Text style={styles.listedAtText}>
							{listedAtString}
						</Text>
					)}
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
