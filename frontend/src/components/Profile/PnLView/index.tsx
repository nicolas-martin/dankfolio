import { View, ScrollView, RefreshControl } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { usePortfolioStore } from '@/store/portfolio';
import { useTransactionsStore } from '@/store/transactions';
import { useStyles } from './pnlview_styles';
import { formatPrice, formatPercentage } from '@/utils/numberFormat';
import { useCallback, useState, useMemo } from 'react';
import { calculatePortfolioStats, calculateTokenStats } from './pnlview_scripts';
import { PnLData } from './pnlview_types';
import CachedImage from '@/components/Common/CachedImage';

const PnLView = () => {
	const { tokens, fetchPortfolioBalance, wallet } = usePortfolioStore();
	const { transactions } = useTransactionsStore();
	const styles = useStyles();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const refreshControlColors = useMemo(() => [styles.colors.primary], [styles.colors.primary]);

	const portfolioStats = useMemo(() => calculatePortfolioStats(tokens, transactions), [tokens, transactions]);
	const tokenStats = useMemo(() => tokens.map(token => calculateTokenStats(token, transactions)), [tokens, transactions]);

	const handleRefresh = useCallback(async () => {
		if (!wallet?.address) return;
		setIsRefreshing(true);
		try {
			await fetchPortfolioBalance(wallet.address, true);
		} finally {
			setIsRefreshing(false);
		}
	}, [wallet?.address, fetchPortfolioBalance]);

	const renderPortfolioSummary = () => (
		<Card style={styles.summaryCard} mode="elevated">
			<Card.Content>
				<Text style={styles.summaryTitle}>Portfolio Summary</Text>
				<View style={styles.statsGrid}>
					<View style={styles.statItem}>
						<Text style={styles.statLabel}>Total Value</Text>
						<Text style={styles.statValue}>{formatPrice(portfolioStats.totalValue, true)}</Text>
					</View>
					<View style={styles.statItem}>
						<Text style={styles.statLabel}>Total P&L</Text>
						<Text style={[
							styles.statValue,
							portfolioStats.totalUnrealizedPnL >= 0 ? styles.pnlPositive : styles.pnlNegative
						]}>
							{portfolioStats.totalUnrealizedPnL >= 0 ? '+' : ''}{formatPrice(portfolioStats.totalUnrealizedPnL, true)}
						</Text>
						<Text style={[
							styles.statSubtext,
							portfolioStats.totalUnrealizedPnL >= 0 ? styles.pnlPositive : styles.pnlNegative
						]}>
							({portfolioStats.totalUnrealizedPnL >= 0 ? '+' : ''}{formatPercentage(portfolioStats.totalPnLPercentage)})
						</Text>
					</View>
				</View>
				{portfolioStats.totalCostBasis === 0 && (
					<>
						<Divider style={styles.divider} />
						<View style={styles.noteContainer}>
							<IconButton
								icon="information-outline"
								size={20}
								iconColor={styles.colors.onSurfaceVariant}
								style={styles.infoIcon}
							/>
							<Text style={styles.noteText}>
								P&L tracking is based on your transaction history. Tokens without transaction data show current value.
							</Text>
						</View>
					</>
				)}
			</Card.Content>
		</Card>
	);

	const renderTokenItem = (data: PnLData, index: number) => {
		const { token } = data;
		const isPositive = data.unrealizedPnL >= 0;
		const isLastItem = index === tokenStats.length - 1;

		return (
			<View key={token.mintAddress} style={[styles.tokenItem, isLastItem && styles.tokenItemLast]}>
				<View style={styles.tokenRow}>
					<View style={styles.tokenLeft}>
						<View style={styles.tokenIconContainer}>
							<CachedImage
								uri={token.coin.logoURI}
								style={styles.tokenIcon}
								testID={`pnl-token-icon-${token.coin.symbol}`}
							/>
						</View>
						<View style={styles.tokenInfo}>
							<Text style={styles.tokenSymbol}>{token.coin.symbol}</Text>
							<Text style={styles.tokenName}>{token.coin.name}</Text>
							<Text style={styles.tokenAmount}>
								{token.amount.toFixed(4)} tokens
							</Text>
						</View>
					</View>
					<View style={styles.tokenRight}>
						<Text style={styles.currentValue}>
							{formatPrice(data.currentValue, true)}
						</Text>
						<Text style={styles.currentPrice}>
							@ {formatPrice(token.price, false)}
						</Text>
						{data.hasPurchaseData ? (
							<View style={styles.pnlContainer}>
								<Text style={isPositive ? styles.pnlValuePositive : styles.pnlValueNegative}>
									{isPositive ? '+' : ''}{formatPrice(data.unrealizedPnL, true)}
								</Text>
								<Text style={isPositive ? styles.pnlPercentagePositive : styles.pnlPercentageNegative}>
									({isPositive ? '+' : ''}{formatPercentage(data.pnlPercentage)})
								</Text>
							</View>
						) : (
							<Text style={styles.noPnlData}>No purchase data</Text>
						)}
					</View>
				</View>
			</View>
		);
	};

	if (tokens.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<IconButton
					icon="chart-line"
					size={48}
					iconColor={styles.colors.onSurfaceVariant}
					style={styles.emptyIcon}
				/>
				<Text style={styles.emptyTitle}>No Holdings</Text>
				<Text style={styles.emptySubtext}>
					Your profit & loss tracking will appear here once you hold tokens
				</Text>
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
			<View style={styles.contentContainer}>
				{tokenStats.map((stat, index) => renderTokenItem(stat, index))}
			</View>
		</ScrollView>
	);
};

export default PnLView;
