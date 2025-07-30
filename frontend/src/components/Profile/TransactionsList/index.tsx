import { View, ActivityIndicator, Linking, ScrollView } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useTransactionsStore } from '@/store/transactions';
import { Transaction, TransactionType, TransactionStatus } from '@/types';
import { useStyles } from './transactionslist_styles';
import { formatPrice } from '@/utils/numberFormat';
import { useState, useEffect } from 'react';
import { useCoinStore } from '@/store/coins';
import CachedImage from '@/components/Common/CachedImage';
import { Coin } from '@/types';
import { formatTransactionDate, getTransactionIcon, getSolscanUrl } from './transactionslist_scripts';

const TransactionsList = () => {
	const { transactions, isLoading, error } = useTransactionsStore();
	const { getCoinsByIDs, coinMap } = useCoinStore();
	const styles = useStyles();
	const [coinData, setCoinData] = useState<Record<string, Coin>>({});

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
				const coins = await getCoinsByIDs([address]);
				if (coins.length > 0) newCoinData[address] = coins[0];
			}

			// Only update if we have new data
			if (Object.keys(newCoinData).length > 0) {
				setCoinData(prev => ({ ...prev, ...newCoinData }));
			}
		};

		if (transactions.length > 0) {
			fetchCoinData();
		}
	}, [transactions, getCoinsByIDs]); // Remove coinMap and coinData from dependencies

	const getCustomStatusStyle = (status: Transaction['status']) => {
		const baseStyle = styles.customStatusBadge;
		switch (status) {
			case TransactionStatus.COMPLETED:
				return [baseStyle, { backgroundColor: styles.theme.success + '20' }];
			case TransactionStatus.PENDING:
				return [baseStyle, { backgroundColor: styles.theme.warning + '20' }];
			case TransactionStatus.FAILED:
				return [baseStyle, { backgroundColor: styles.colors.error + '90' }];
			default:
				return [baseStyle, { backgroundColor: styles.colors.surfaceVariant }];
		}
	};

	const getCustomStatusTextStyle = (status: Transaction['status']) => {
		const baseStyle = styles.customStatusText;
		switch (status) {
			case TransactionStatus.COMPLETED:
				return [baseStyle, { color: styles.theme.success }];
			case TransactionStatus.PENDING:
				return [baseStyle, { color: styles.theme.warning }];
			case TransactionStatus.FAILED:
				return [baseStyle, { color: '#FFFFFF' }];
			default:
				return [baseStyle, { color: styles.colors.onSurfaceVariant }];
		}
	};

	const handleStatusPress = (transaction: Transaction) => {
		if (transaction.status === TransactionStatus.COMPLETED && transaction.transactionHash) {
			const solscanUrl = getSolscanUrl(transaction.transactionHash);
			Linking.openURL(solscanUrl);
		}
	};

	const renderTransaction = (item: Transaction, index: number) => {
		const isSwap = item.type === TransactionType.SWAP;
		const fromCoin = item.fromCoinMintAddress ? (coinData[item.fromCoinMintAddress] || coinMap[item.fromCoinMintAddress]) : null;
		const toCoin = item.toCoinMintAddress ? (coinData[item.toCoinMintAddress] || coinMap[item.toCoinMintAddress]) : null;

		// Fallback icon URLs if coin data not found
		const fromIconURI = fromCoin?.logoURI
		const toIconURI = toCoin?.logoURI

		const isLastItem = index === transactions.length - 1;
		const transactionStyles = isLastItem ? [styles.transactionItem, styles.transactionItemLast] : [styles.transactionItem];

		return (
			<View key={item.id} style={transactionStyles}>
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
						<View style={styles.transactionRow}>
							<View style={styles.coinIconContainer}>
								{fromIconURI && (
									<CachedImage
										uri={fromIconURI}
										style={styles.coinIcon}
									/>
								)}
							</View>
							{isSwap && (
								<>
									<IconButton
										icon="arrow-right"
										size={16}
										iconColor={styles.colors.onSurfaceVariant}
										style={styles.arrowIcon}
									/>
									<View style={styles.coinIconContainer}>
										{toIconURI && (
											<CachedImage
												uri={toIconURI}
												style={styles.coinIcon}
											/>
										)}
									</View>
								</>
							)}
						</View>
						<Text style={styles.coinAmount}>
							{formatPrice(item.amount, false)}
						</Text>
					</View>
					<View style={styles.transactionRight}>
						<Text style={styles.transactionDate}>
							{formatTransactionDate(item.date)}
						</Text>
						<View
							style={getCustomStatusStyle(item.status)}
						>
							<Text style={getCustomStatusTextStyle(item.status)}> {item.status} </Text>
						</View>
					</View>
				</View>
			</View>
		);
	};

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
		<ScrollView style={styles.container}>
			<View style={styles.listContainer}>
				{transactions.map((transaction, index) => renderTransaction(transaction, index))}
			</View>
		</ScrollView>
	);
};

export default TransactionsList;
