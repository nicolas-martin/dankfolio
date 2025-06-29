import React, { useCallback } from 'react';
import { View, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { FlatList } from 'react-native';
import CoinInfoBlock from '@components/Common/CoinInfoBlock';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import SparklineChart from '@/components/Chart/SparklineChart';
import { formatPercentage } from '@/utils/numberFormat';
import { TokenListCardProps, TokenListItemProps } from './tokenlistcard_types';
import { useStyles } from './tokenlistcard_styles';
import { handleTokenPress } from './tokenlistcard_scripts';
import { Coin } from '@/types';

const screenWidth = Dimensions.get('window').width;

const TokenListItem: React.FC<TokenListItemProps> = React.memo(({
	coin,
	onPress,
	priceHistory,
	isPriceHistoryLoading,
	showSparkline = true,
	isLastItem = false,
	testIdPrefix = 'token',
}) => {
	const styles = useStyles();

	const handlePress = useCallback(() => {
		handleTokenPress(coin, onPress);
	}, [coin, onPress]);

	return (
		<>
			<TouchableOpacity
				style={styles.itemContainer}
				onPress={handlePress}
				testID={`${testIdPrefix}-item-${coin.symbol.toLowerCase()}`}
				accessible={false}
				importantForAccessibility="no-hide-descendants"
				accessibilityRole="button"
				activeOpacity={0.7}
			>
				<View style={styles.itemContent}>
					<CoinInfoBlock
						containerStyle={styles.leftSection}
						iconUri={coin.resolvedIconUrl}
						iconSize={36}
						primaryText={coin.symbol}
						secondaryText={coin.name}
						primaryTextStyle={styles.symbol}
						secondaryTextStyle={styles.name}
						textContainerStyle={styles.nameSection}
						testIdPrefix={testIdPrefix}
					/>

					{showSparkline && (
						<View style={styles.sparklineContainer}>
							{isPriceHistoryLoading ? (
								<ShimmerPlaceholder
									width={screenWidth * 0.35}
									height={30}
									borderRadius={4}
								/>
							) : priceHistory && priceHistory.length > 1 ? (
								<SparklineChart
									data={priceHistory}
									width={screenWidth * 0.35}
									height={30}
									isLoading={isPriceHistoryLoading}
									testID={`${testIdPrefix}-sparkline-${coin.symbol.toLowerCase()}`}
								/>
							) : (
								<ShimmerPlaceholder
									width={screenWidth * 0.35}
									height={30}
									borderRadius={4}
								/>
							)}
						</View>
					)}

					<View style={styles.rightSection}>
						{coin.price24hChangePercent !== undefined ? (
							<Text
								style={[
									styles.percentChange,
									coin.price24hChangePercent > 0
										? styles.changePositive
										: coin.price24hChangePercent < 0
											? styles.changeNegative
											: styles.changeNeutral
								]}
								numberOfLines={1}
								testID={`${testIdPrefix}-change-${coin.symbol.toLowerCase()}`}
								accessible={true}
								accessibilityRole="text"
							>
								{formatPercentage(coin.price24hChangePercent, 1, true)}
							</Text>
						) : (
							<Text
								style={[styles.percentChange, styles.changeNeutral]}
								numberOfLines={1}
							>
								--%
							</Text>
						)}
					</View>
				</View>
			</TouchableOpacity>
			{!isLastItem && <View style={styles.divider} />}
		</>
	);
}, (prevProps, nextProps) => {
	return (
		prevProps.coin.address === nextProps.coin.address &&
		prevProps.coin.price === nextProps.coin.price &&
		prevProps.coin.price24hChangePercent === nextProps.coin.price24hChangePercent &&
		prevProps.coin.resolvedIconUrl === nextProps.coin.resolvedIconUrl &&
		prevProps.coin.symbol === nextProps.coin.symbol &&
		prevProps.coin.name === nextProps.coin.name &&
		prevProps.priceHistory === nextProps.priceHistory &&
		prevProps.isPriceHistoryLoading === nextProps.isPriceHistoryLoading &&
		prevProps.showSparkline === nextProps.showSparkline &&
		prevProps.isLastItem === nextProps.isLastItem &&
		prevProps.testIdPrefix === nextProps.testIdPrefix &&
		prevProps.onPress === nextProps.onPress
	);
});

TokenListItem.displayName = 'TokenListItem';

const TokenListCard: React.FC<TokenListCardProps> = ({
	title,
	coins,
	priceHistories = {},
	isLoadingPriceHistories = {},
	onCoinPress,
	showSparkline = true,
	testIdPrefix = 'token-list',
}) => {
	const styles = useStyles();

	const renderItem = useCallback(({ item, index }: { item: Coin; index: number }) => {
		const history = priceHistories[item.address!];
		const isLoadingHistory = isLoadingPriceHistories[item.address!];
		const isLastItem = index === coins.length - 1;

		return (
			<TokenListItem
				coin={item}
				onPress={onCoinPress}
				priceHistory={history}
				isPriceHistoryLoading={isLoadingHistory}
				showSparkline={showSparkline}
				isLastItem={isLastItem}
				testIdPrefix={testIdPrefix}
			/>
		);
	}, [coins.length, priceHistories, isLoadingPriceHistories, onCoinPress, showSparkline, testIdPrefix]);

	return (
		<View style={styles.container} testID={`${testIdPrefix}-card`}>
			<View style={styles.header}>
				<Text style={styles.title}>{title}</Text>
			</View>
			<View style={styles.listContainer}>
				<FlatList
					data={coins}
					keyExtractor={(item, index) => `${testIdPrefix}-${item.address || item.symbol || index}`}
					renderItem={renderItem}
					scrollEnabled={false}
					maxToRenderPerBatch={5}
					updateCellsBatchingPeriod={50}
					initialNumToRender={10}
					windowSize={10}
					keyboardShouldPersistTaps="handled"
				/>
			</View>
		</View>
	);
};

export default TokenListCard;
