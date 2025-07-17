import { View, ScrollView, RefreshControl } from 'react-native';
import { Text, IconButton, DataTable } from 'react-native-paper';
import { usePortfolioStore } from '@/store/portfolio';
import { useTransactionsStore } from '@/store/transactions';
import { useStyles } from './pnlview_styles';
import { formatTokenBalance, formatPercentage } from '@/utils/numberFormat';
import { useCallback, useState, useMemo } from 'react';
import { calculateTokenStats } from './pnlview_scripts';
import { PnLData } from './pnlview_types';
import CachedImage from '@/components/Common/CachedImage';

const PnLView = () => {
	const { tokens, fetchPortfolioBalance, wallet } = usePortfolioStore();
	const { transactions } = useTransactionsStore();
	const styles = useStyles();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const refreshControlColors = useMemo(() => [styles.colors.primary], [styles.colors.primary]);

	const tokenStats = useMemo(() => tokens.map(token => calculateTokenStats(token, transactions)), [tokens, transactions]);
	tokenStats.sort((a, b) => b.unrealizedPnL - a.unrealizedPnL);

	const handleRefresh = useCallback(async () => {
		if (!wallet?.address) return;
		setIsRefreshing(true);
		try {
			await fetchPortfolioBalance(wallet.address, true);
		} finally {
			setIsRefreshing(false);
		}
	}, [wallet?.address, fetchPortfolioBalance]);

	const renderTokenItem = (data: PnLData) => {
		const { token } = data;
		const isPositive = data.unrealizedPnL >= 0;
		if (!data.hasPurchaseData) {
			return null
		}

		return (
			<DataTable>
				<DataTable.Header>
					<DataTable.Title><Text>Coin</Text></DataTable.Title>
					<DataTable.Title><Text>Value</Text></DataTable.Title>
					<DataTable.Title><Text>Change</Text></DataTable.Title>
				</DataTable.Header>
				<DataTable.Row key={token.mintAddress}>
					<DataTable.Cell>
						<CachedImage
							uri={token.coin.logoURI}
							style={styles.tokenIcon}
							testID={`pnl-token-icon-${token.coin.symbol}`}
						/>
					</DataTable.Cell>
					<DataTable.Cell numeric>
						<Text style={styles.tokenSymbol}>{token.coin.symbol}</Text>
						<Text style={styles.tokenAmount}> {formatTokenBalance(token.amount)} </Text>
					</DataTable.Cell>
					<DataTable.Cell numeric>
						<Text style={isPositive ? styles.pnlPercentagePositive : styles.pnlPercentageNegative}>
							({formatPercentage(data.pnlPercentage)})
						</Text>
					</DataTable.Cell>
				</DataTable.Row>
			</DataTable>
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
				{tokenStats.map((stat) => renderTokenItem(stat))}
			</View>
		</ScrollView>
	);
};

export default PnLView;
