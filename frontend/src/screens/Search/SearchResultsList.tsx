import React, { useCallback } from 'react';
import { View, FlatList, TouchableOpacity, Text } from 'react-native';
import CoinInfoBlock from '@components/Common/CoinInfoBlock';
import { formatAddress, formatPrice } from '@/utils/numberFormat';
import { Coin } from '@/types';
import { useStyles } from './styles';

interface SearchResultsListProps {
	coins: Coin[];
	onCoinPress: (coin: Coin) => void;
	testIdPrefix?: string;
}

const SearchResultsList: React.FC<SearchResultsListProps> = ({
	coins,
	onCoinPress,
	testIdPrefix = 'search-result',
}) => {
	const styles = useStyles();

	const renderItem = useCallback(({ item, index }: { item: Coin; index: number }) => {
		const isLastItem = index === coins.length - 1;

		return (
			<>
				<TouchableOpacity
					style={styles.tokenItem}
					onPress={() => onCoinPress(item)}
					testID={`${testIdPrefix}-item-${item.symbol.toLowerCase()}`}
					accessibilityRole="button"
					activeOpacity={0.7}
				>
					<View style={styles.tokenInfo}>
						<CoinInfoBlock
							iconUri={item.logoURI}
							iconSize={36}
							primaryText={item.symbol}
							secondaryText={item.name}
							primaryTextStyle={styles.tokenName}
							secondaryTextStyle={styles.tokenVolume}
							testIdPrefix={testIdPrefix}
						/>
					</View>

					<View style={styles.tokenMetrics}>
						<Text
							style={styles.tokenPrice}
							numberOfLines={1}
							testID={`${testIdPrefix}-price-${item.symbol.toLowerCase()}`}
						>
							{formatPrice(item.price, true)}
						</Text>
						<Text
							style={styles.tokenVolume}
							numberOfLines={1}
							testID={`${testIdPrefix}-address-${item.symbol.toLowerCase()}`}
						>
							{formatAddress(item.address, 6, 4)}
						</Text>
					</View>
				</TouchableOpacity>
				{!isLastItem && <View style={styles.divider} />}
			</>
		);
	}, [coins.length, onCoinPress, styles, testIdPrefix]);

	return (
		<FlatList
			data={coins}
			keyExtractor={(item) => item.address}
			renderItem={renderItem}
			contentContainerStyle={styles.listContent}
			showsVerticalScrollIndicator={true}
			keyboardShouldPersistTaps="handled"
			style={styles.searchResultsContainer}
		/>
	);
};

export default SearchResultsList;