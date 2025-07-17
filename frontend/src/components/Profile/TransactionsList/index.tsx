import { View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton } from 'react-native-paper';
import { useTransactionsStore } from '@/store/transactions';
import { Transaction, TransactionType, TransactionStatus } from '@/types';
import { logger } from '@/utils/logger';
import { useStyles } from './transactionslist_styles';
import { formatPrice } from '@/utils/numberFormat';
import { useCallback, useState, useMemo, useEffect } from 'react';
import { usePortfolioStore } from '@/store/portfolio';
import { useCoinStore } from '@/store/coins';
import CachedImage from '@/components/Common/CachedImage';
import { Coin } from '@/types';

const TransactionsList = () => {
	const { transactions, isLoading, error, fetchRecentTransactions } = useTransactionsStore();
	const { wallet } = usePortfolioStore();
	const { getCoinByID, coinMap } = useCoinStore();
	const styles = useStyles();
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [coinData, setCoinData] = useState<Record<string, Coin>>({});

	const refreshControlColors = useMemo(() => [styles.colors.primary], [styles.colors.primary]);

	// Fetch coin data for transactions
	useEffect(() => {
		const fetchCoinData = async () => {
			const mintAddresses = new Set<string>();
			transactions.forEach(tx => {
				if (tx.fromCoinMintAddress) mintAddresses.add(tx.fromCoinMintAddress);
				if (tx.toCoinMintAddress) mintAddresses.add(tx.toCoinMintAddress);
			});

			const newCoinData: Record<string, Coin> = {};
			for (const address of mintAddresses) {
				// Skip if we already have this coin data
				if (coinData[address] || coinMap[address]) {
					continue;
				}
				const coin = await getCoinByID(address);
				if (coin) newCoinData[address] = coin;
			}

			// Only update if we have new data
			if (Object.keys(newCoinData).length > 0) {
				setCoinData(prev => ({ ...prev, ...newCoinData }));
			}
		};

		if (transactions.length > 0) {
			fetchCoinData();
		}
	}, [transactions, getCoinByID]); // Remove coinMap and coinData from dependencies

	const getTransactionIcon = (type: Transaction['type']) => {
		switch (type) {
			case TransactionType.SWAP:
				return 'swap-horizontal';
			case TransactionType.TRANSFER:
				return 'arrow-top-right';
			default:
				return 'help-circle-outline';
		}
	};

	const getStatusChipStyle = (status: Transaction['status']) => {
		switch (status) {
			case TransactionStatus.COMPLETED:
				return styles.statusChipCompleted;
			case TransactionStatus.PENDING:
				return styles.statusChipPending;
			case TransactionStatus.FAILED:
				return styles.statusChipFailed;
			default:
				return styles.statusChip;
		}
	};

	const formatTransactionDate = (dateString: string) => {
		const date = new Date(dateString);
		const now = new Date();
		const diffTime = Math.abs(now.getTime() - date.getTime());
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays === 0) {
			return `Today at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
		} else if (diffDays === 1) {
			return `Yesterday at ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
		} else if (diffDays < 7) {
			return `${diffDays} days ago`;
		} else {
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		}
	};

	const handleRefresh = useCallback(async () => {
		if (!wallet?.address) return;
		setIsRefreshing(true);
		try {
			await fetchRecentTransactions(wallet.address);
		} finally {
			setIsRefreshing(false);
		}
	}, [wallet?.address, fetchRecentTransactions]);

	const renderTransaction = (item: Transaction) => {
		const isSwap = item.type === TransactionType.SWAP;
		const fromCoin = item.fromCoinMintAddress ? (coinData[item.fromCoinMintAddress] || coinMap[item.fromCoinMintAddress]) : null;
		const toCoin = item.toCoinMintAddress ? (coinData[item.toCoinMintAddress] || coinMap[item.toCoinMintAddress]) : null;

		// Fallback icon URLs if coin data not found
		const fromIconURI = fromCoin?.logoURI
		const toIconURI = toCoin?.logoURI
		if (fromCoin && !fromIconURI) {
			logger.warn(`No icon found for fromCoinMintAddress: ${item.fromCoinMintAddress}`);
			return null;
		}

		return (
			<Card key={item.id} style={styles.transactionCard} mode="outlined">
				<Card.Content style={styles.cardContent}>
					<View style={styles.transactionMainRow}>
						<View style={styles.transactionLeft}>
							<View style={styles.transactionHeader}>
								<IconButton
									icon={getTransactionIcon(item.type)}
									size={20}
									iconColor={styles.colors.onSurfaceVariant}
									style={styles.transactionTypeIcon}
								/>
								<Text style={styles.transactionType}>
									{item.type === TransactionType.SWAP ? 'Swap' : item.type === TransactionType.TRANSFER ? 'Transfer' : 'Transaction'}
								</Text>
							</View>
							<View style={styles.coinIconsRow}>
								<View style={styles.coinItem}>
									<CachedImage
										uri={fromIconURI}
										style={styles.coinIcon}
									/>
									<View style={styles.coinTextContainer}>
										<Text style={styles.coinAmount}>
											{formatPrice(item.amount, false)}
										</Text>
										<Text style={styles.coinSymbol}>{item.fromCoinSymbol}</Text>
									</View>
								</View>
								{isSwap && (
									<>
										<IconButton
											icon="arrow-right"
											size={16}
											iconColor={styles.colors.onSurfaceVariant}
											style={styles.arrowIcon}
										/>
										<View style={styles.coinItem}>
											<CachedImage
												uri={toIconURI}
												style={styles.coinIcon}
											/>
											<Text style={styles.coinSymbol}>{item.toCoinSymbol}</Text>
										</View>
									</>
								)}
							</View>
						</View>
						<View style={styles.transactionRight}>
							<Text style={styles.transactionDate}>
								{formatTransactionDate(item.date)}
							</Text>
							<Chip
								mode="flat"
								compact
								textStyle={styles.statusChipText}
								style={getStatusChipStyle(item.status)}
							>
								{item.status}
							</Chip>
						</View>
					</View>
				</Card.Content>
			</Card>
		);
	};

	if (isLoading && !isRefreshing) {
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

	if (transactions.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<IconButton icon="history" size={48} iconColor={styles.colors.onSurfaceVariant} style={styles.emptyIcon} />
				<Text style={styles.emptyTitle}>No transactions yet</Text>
				<Text style={styles.emptySubtext}>Your transaction history will appear here</Text>
			</View>
		);
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={styles.scrollContent}
			refreshControl={
				<RefreshControl
					refreshing={isRefreshing}
					onRefresh={handleRefresh}
					colors={refreshControlColors}
					tintColor={styles.colors.primary}
				/>
			}
		>
			<View style={styles.listContainer}>
				{transactions.map(renderTransaction)}
			</View>
		</ScrollView>
	);
};

export default TransactionsList;
