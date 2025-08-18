import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FlatList, View, ActivityIndicator, RefreshControl, Linking } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTransactionsStore } from '@/store/transactions';
import { usePortfolioStore } from '@/store/portfolio';
import { useCoinStore } from '@/store/coins';
import ActivityRow from './ActivityRow';
import { ActivityItem } from './activity_types';
import { txToActivityItem } from './activity_utils';
import { useStyles } from './activity_styles';
import { getSolscanUrl } from './transactionslist_scripts';
import { logger } from '@/utils/logger';

const ActivityList: React.FC = () => {
	const { transactions, isLoading, error, fetchRecentTransactions, hasFetched } = useTransactionsStore();
	const { getCoinsByIDs, coinMap } = useCoinStore();
	const { wallet } = usePortfolioStore();
	const styles = useStyles();

	const [isRefreshing, setIsRefreshing] = useState(false);
	const refreshControlColors = useMemo(() => [styles.colors.primary], [styles.colors.primary]);

	// Fetch transactions when component mounts and wallet is available
	useEffect(() => {
		if (wallet?.address && !hasFetched) {
			logger.info('ActivityList: Fetching transactions on mount');
			fetchRecentTransactions(wallet.address);
		}
	}, [wallet?.address, fetchRecentTransactions, hasFetched]);

	// Fetch coin data for transactions
	useEffect(() => {
		const fetchCoinData = async () => {
			const mintAddresses = new Set<string>();
			transactions.forEach(tx => {
				if (tx.fromCoinMintAddress) mintAddresses.add(tx.fromCoinMintAddress);
				if (tx.toCoinMintAddress) mintAddresses.add(tx.toCoinMintAddress);
			});

			for (const address of mintAddresses) {
				// Skip if we already have this coin data
				if (coinMap[address]) continue;

				try {
					const coins = await getCoinsByIDs([address]);
					// Coin data will be automatically added to coinMap by the store
				} catch (error) {
					logger.warn(`Failed to fetch coin data for ${address}:`, error);
				}
			}
		};

		if (transactions.length > 0) {
			fetchCoinData();
		}
	}, [transactions, getCoinsByIDs, coinMap]);

	// Convert transactions to activity items
	const activityItems = useMemo((): ActivityItem[] => {
		return transactions
			.map(tx => txToActivityItem(tx, wallet?.address))
			.sort((a, b) => b.timestamp - a.timestamp); // Sort by timestamp descending
	}, [transactions, wallet?.address]);

	// Handle refresh
	const handleRefresh = useCallback(async () => {
		if (!wallet?.address) return;
		setIsRefreshing(true);
		try {
			await fetchRecentTransactions(wallet.address);
		} finally {
			setIsRefreshing(false);
		}
	}, [wallet?.address, fetchRecentTransactions]);

	// Handle row press
	const handleActivityPress = useCallback((item: ActivityItem) => {
		if (item.status === 'completed' && item.transactionHash) {
			const solscanUrl = getSolscanUrl(item.transactionHash);
			Linking.openURL(solscanUrl);
		}
	}, []);

	// Handle row long press (could implement copy functionality)
	const handleActivityLongPress = useCallback((item: ActivityItem) => {
		// TODO: Implement copy functionality for addresses/amounts
		logger.info('Long pressed activity item:', item.id);
	}, []);

	// Render activity item
	const renderActivityItem = useCallback(({ item }: { item: ActivityItem }) => (
		<ActivityRow
			item={item}
			onPress={handleActivityPress}
			onLongPress={handleActivityLongPress}
		/>
	), [handleActivityPress, handleActivityLongPress]);

	// Render item separator
	const renderItemSeparator = useCallback(() => (
		<View style={styles.activityRowSeparator} />
	), [styles.activityRowSeparator]);

	// Get item key
	const keyExtractor = useCallback((item: ActivityItem) => item.id, []);

	if (isLoading) {
		return (
			<View style={styles.centerContainer}>
				<ActivityIndicator size="large" color={styles.colors.primary} />
				<Text style={styles.loadingText}>Loading transactions...</Text>
			</View>
		);
	}

	if (error) {
		return (
			<View style={styles.centerContainer}>
				<IconButton icon="alert-circle-outline" size={48} iconColor={styles.colors.error} />
				<Text style={styles.errorText}>Failed to load transactions</Text>
				<Text style={styles.errorSubtext}>{error}</Text>
			</View>
		);
	}

	if (activityItems.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<IconButton
					icon="history"
					size={48}
					iconColor={styles.colors.onSurfaceVariant}
					style={styles.emptyIcon}
				/>
				<Text style={styles.emptyTitle}>No transactions yet</Text>
				<Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
			</View>
		);
	}

	return (
		<FlatList
			data={activityItems}
			renderItem={renderActivityItem}
			keyExtractor={keyExtractor}
			ItemSeparatorComponent={renderItemSeparator}
			contentContainerStyle={styles.listContainer}
			style={styles.container}
			refreshControl={
				<RefreshControl
					refreshing={isRefreshing}
					onRefresh={handleRefresh}
					colors={refreshControlColors}
					tintColor={styles.colors.primary}
				/>
			}
			showsVerticalScrollIndicator={false}
		/>
	);
};

export default ActivityList;
