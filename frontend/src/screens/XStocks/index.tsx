import React, { useCallback } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import { useXStocksData } from './xstocks_scripts';
import { useStyles } from './xstocks_styles';
import { formatPrice, formatCompactPercentage } from '@/utils/numberFormat';
import { Coin } from '@/types';
import CachedImage from '@/components/Common/CachedImage';
import { logger } from '@/utils/logger';

const XStocks: React.FC = () => {
	const styles = useStyles();
	const {
		xStocksTokens,
		loading,
		refreshing,
		handleRefresh,
		handleCoinPress,
	} = useXStocksData();

	const renderItem = useCallback(({ item }: { item: Coin }) => {
		logger.log('[XStocks] Rendering item:', {
			symbol: item.symbol,
			name: item.name,
			logoURI: item.logoURI,
			hasLogo: !!item.logoURI,
		});
		
		const priceChangeColor = item.price24hChangePercent && item.price24hChangePercent >= 0
			? styles.positiveChange
			: styles.negativeChange;

		return (
			<TouchableOpacity
				style={styles.itemContainer}
				onPress={() => handleCoinPress(item)}
				activeOpacity={0.7}
			>
				<View style={styles.itemContent}>
					<View style={styles.leftSection}>
						{item.logoURI ? (
							<CachedImage uri={item.logoURI} size={40} />
						) : (
							<View style={styles.placeholderIcon}>
								<Text style={styles.placeholderText}>{item.symbol.charAt(0)}</Text>
							</View>
						)}
						<View style={styles.tokenInfo}>
							<Text style={styles.symbol}>{item.symbol}</Text>
							<Text style={styles.name}>{item.name}</Text>
						</View>
					</View>
					<View style={styles.rightSection}>
						<Text style={styles.price}>{formatPrice(item.price)}</Text>
						<Text style={[styles.priceChange, priceChangeColor]}>
							{formatCompactPercentage(item.price24hChangePercent || 0)}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
		);
	}, [styles, handleCoinPress]);

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				<Text style={styles.headerTitle}>xStocks</Text>

			{loading && xStocksTokens.length === 0 ? (
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={styles.loadingIndicator.color} />
				</View>
			) : (
				<View style={styles.listWrapper}>
					<FlatList
						data={xStocksTokens}
						renderItem={renderItem}
						keyExtractor={(item) => item.address}
						ItemSeparatorComponent={() => <View style={styles.separator} />}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={handleRefresh}
								tintColor={styles.loadingIndicator.color}
							/>
						}
						ListEmptyComponent={
							<View style={styles.emptyContainer}>
								<Text style={styles.emptyText}>No xStocks tokens found</Text>
								<TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
									<Text style={styles.retryButtonText}>Retry</Text>
								</TouchableOpacity>
							</View>
						}
						contentContainerStyle={xStocksTokens.length === 0 ? styles.emptyListContainer : styles.listContainer}
					/>
				</View>
			)}
			</View>
		</SafeAreaView>
	);
};

export default XStocks;
