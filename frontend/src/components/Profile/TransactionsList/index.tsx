import { View, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { Text, Card, Chip, IconButton } from 'react-native-paper';
import { useTransactionsStore } from '@/store/transactions';
import { Transaction } from '@/types';
import { useStyles } from './transactionslist_styles';
import { formatPrice } from '@/utils/numberFormat';
import { useCallback, useState, useMemo } from 'react';
import { usePortfolioStore } from '@/store/portfolio';

const TransactionsList = () => {
	const { transactions, isLoading, error, fetchRecentTransactions } = useTransactionsStore();
	const { wallet } = usePortfolioStore();
	const styles = useStyles();
	const [isRefreshing, setIsRefreshing] = useState(false);
	
	const refreshControlColors = useMemo(() => [styles.colors.primary], [styles.colors.primary]);

	const getTransactionIcon = (type: Transaction['type']) => {
		switch (type) {
			case 'SWAP':
				return 'swap-horizontal';
			case 'TRANSFER':
				return 'arrow-top-right';
			default:
				return 'help-circle-outline';
		}
	};

	const getStatusChipStyle = (status: Transaction['status']) => {
		switch (status) {
			case 'COMPLETED':
				return styles.statusChipCompleted;
			case 'PENDING':
				return styles.statusChipPending;
			case 'FAILED':
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
		const isSwap = item.type === 'SWAP';
		
		return (
			<Card key={item.id} style={styles.transactionCard} mode="outlined">
				<Card.Content style={styles.cardContent}>
					<View style={styles.transactionRow}>
						<View style={styles.transactionLeft}>
							<View style={styles.iconContainer}>
								<IconButton
									icon={getTransactionIcon(item.type)}
									size={24}
									iconColor={styles.colors.primary}
									style={styles.transactionIcon}
								/>
							</View>
							<View style={styles.transactionInfo}>
								<Text style={styles.transactionType}>
									{item.type === 'SWAP' ? 'Swap' : item.type === 'TRANSFER' ? 'Transfer' : 'Transaction'}
								</Text>
								<Text style={styles.transactionDetails}>
									{isSwap ? `${item.fromCoinSymbol} → ${item.toCoinSymbol}` : item.fromCoinSymbol}
								</Text>
							</View>
						</View>
						<View style={styles.transactionRight}>
							<Text style={styles.transactionAmount}>
								{formatPrice(item.amount, false)} {item.fromCoinSymbol}
							</Text>
							<Text style={styles.transactionDate}>
								{formatTransactionDate(item.date)}
							</Text>
						</View>
					</View>
					<View style={styles.statusContainer}>
						<Chip
							mode="flat"
							compact
							textStyle={styles.statusChipText}
							style={getStatusChipStyle(item.status)}
						>
							{item.status}
						</Chip>
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