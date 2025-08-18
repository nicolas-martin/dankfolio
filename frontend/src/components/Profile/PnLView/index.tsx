import { View, ScrollView, RefreshControl } from 'react-native';
import { Text, IconButton, DataTable } from 'react-native-paper';
import { usePortfolioStore } from '@/store/portfolio';
import { useStyles } from './pnlview_styles';
import { formatTokenBalance, formatPercentage, formatPrice, formatUsdAmount } from '@/utils/numberFormat';
import { useCallback, useMemo, useState } from 'react';
import { useEffect } from 'react';
import CachedImage from '@/components/Common/CachedImage';
import { useCoinStore } from '@/store/coins';

const PnLView = () => {
	const {
		tokens,
		fetchPortfolioPnL,
		wallet,
		pnlData,
		isPnlLoading,
		totalPortfolioValue
	} = usePortfolioStore();
	const styles = useStyles();
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [sortBy, setSortBy] = useState<'value' | 'pnl' | 'allocation' | null>('value');
	const [sortDirection, setSortDirection] = useState<'ascending' | 'descending'>('descending');

	const refreshControlColors = useMemo(() => [styles.colors.primary], [styles.colors.primary]);

	// Fetch PnL data from backend when wallet changes
	useEffect(() => {
		if (wallet?.address) {
			fetchPortfolioPnL(wallet.address);
		}
	}, [wallet?.address, fetchPortfolioPnL]);

	const handleRefresh = useCallback(async () => {
		if (!wallet?.address) return;
		setIsRefreshing(true);
		try {
			// Get current PnL data to know which coins to refresh
			const currentPnlData = pnlData || [];
			const pnlCoinAddresses = currentPnlData.map(item => item.coinId);

			if (pnlCoinAddresses.length > 0) {
				// Use coin store's method to fetch and cache fresh prices
				const coinStore = useCoinStore.getState();
				await coinStore.getCoinsByIDs(pnlCoinAddresses, true);
			}

			// THEN fetch PnL data which will use the fresh prices from cache
			await fetchPortfolioPnL(wallet.address);
		} catch {
			// Error handling is done in the store functions
		} finally {
			setIsRefreshing(false);
		}
	}, [wallet?.address, fetchPortfolioPnL, pnlData]);

	// Handle column header clicks for sorting
	const handleSort = useCallback((column: 'value' | 'pnl' | 'allocation') => {
		if (sortBy === column) {
			// If clicking the same column, toggle direction
			setSortDirection(sortDirection === 'ascending' ? 'descending' : 'ascending');
		} else {
			// If clicking a different column, set it as active with descending order
			setSortBy(column);
			setSortDirection('descending');
		}
	}, [sortBy, sortDirection]);

	// Sort the data based on current sort settings
	const sortedData = useMemo(() => {
		if (!pnlData || pnlData.length === 0) return [];

		const sorted = [...pnlData].sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case 'value':
					comparison = a.currentValue - b.currentValue;
					break;
				case 'pnl':
					comparison = a.unrealizedPnl - b.unrealizedPnl;
					break;
				case 'allocation':
					const aAllocation = (a.currentValue / totalPortfolioValue) * 100;
					const bAllocation = (b.currentValue / totalPortfolioValue) * 100;
					comparison = aAllocation - bAllocation;
					break;
				default:
					return 0;
			}

			return sortDirection === 'ascending' ? comparison : -comparison;
		});

		return sorted;
	}, [pnlData, sortBy, sortDirection, totalPortfolioValue]);

	// Only show PnL data if loaded from backend
	const displayData = sortedData;

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

	if (isPnlLoading) {
		return (
			<View style={styles.emptyContainer}>
				<Text style={styles.emptyTitle}>Loading P&L data...</Text>
			</View>
		);
	}

	if (!pnlData || displayData.length === 0) {
		return (
			<View style={styles.emptyContainer}>
				<IconButton
					icon="chart-line-variant"
					size={48}
					iconColor={styles.colors.onSurfaceVariant}
					style={styles.emptyIcon}
				/>
				<Text style={styles.emptyTitle}>No Trading History</Text>
				<Text style={styles.emptySubtext}>
					Your profit & loss will appear here once you make trades
				</Text>
			</View>
		);
	}


	return (
		<ScrollView
			style={styles.container}
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
				<DataTable>
					<DataTable.Header style={styles.tableHeader}>
						<DataTable.Title style={styles.iconColumn}>
							{/* Empty header for icon column */}
						</DataTable.Title>
						<DataTable.Title style={styles.symbolColumn}>
							<Text style={styles.headerText}>ASSET</Text>
						</DataTable.Title>
						<DataTable.Title numeric style={styles.costBasisColumn}>
							<Text style={styles.headerText}>COST</Text>
						</DataTable.Title>
						<DataTable.Title
							numeric
							sortDirection={sortBy === 'value' ? sortDirection : undefined}
							onPress={() => handleSort('value')}
							style={styles.valueColumn}
						>
							<Text style={styles.headerText}>VALUE</Text>
						</DataTable.Title>
						<DataTable.Title
							numeric
							sortDirection={sortBy === 'pnl' ? sortDirection : undefined}
							onPress={() => handleSort('pnl')}
							style={styles.pnlColumn}
						>
							<Text style={styles.headerText}>P&L</Text>
						</DataTable.Title>
						<DataTable.Title
							numeric
							sortDirection={sortBy === 'allocation' ? sortDirection : undefined}
							onPress={() => handleSort('allocation')}
							style={styles.allocationColumn}
						>
							<Text style={styles.headerText}>%</Text>
						</DataTable.Title>
					</DataTable.Header>

					{displayData.map((tokenPnL, index) => {
						// Check if P&L is essentially zero (very small number)
						// Backend returns decimal values (0.25 for 25%)
						const percentageValue = tokenPnL.pnlPercentage * 100;
						const isEssentiallyZero = Math.abs(percentageValue) < 0.01; // 0.01% threshold
						const isPositive = !isEssentiallyZero && tokenPnL.pnlPercentage > 0;

						// Calculate portfolio allocation percentage
						const allocationPercent = totalPortfolioValue > 0
							? (tokenPnL.currentValue / totalPortfolioValue) * 100
							: 0;

						// Find matching token for logo
						const matchingToken = tokens.find(t => t.mintAddress === tokenPnL.coinId);

						return (
							<DataTable.Row
								key={tokenPnL.coinId}
								style={[styles.tableRow, index === displayData.length - 1 && styles.lastRow]}
							>
								{/* Icon Column */}
								<DataTable.Cell style={styles.iconColumnCell}>
									{matchingToken ? (
										<CachedImage
											uri={matchingToken.coin.logoURI}
											style={styles.tokenIcon}
											testID={`pnl-token-icon-${tokenPnL.symbol}`}
										/>
									) : (
										<View style={styles.tokenIcon} />
									)}
								</DataTable.Cell>

								{/* Asset Column */}
								<DataTable.Cell style={styles.symbolColumnStart}>
									<View style={styles.tokenNameContainer}>
										<Text style={styles.tokenSymbol}>{tokenPnL.symbol}</Text>
										<Text style={styles.tokenAmount}>{formatTokenBalance(tokenPnL.amountHeld)}</Text>
									</View>
								</DataTable.Cell>

								{/* Cost Basis Column */}
								<DataTable.Cell numeric style={styles.costBasisColumnCenter}>
									<Text style={styles.costBasisText}>
										{tokenPnL.hasPurchaseData ? formatPrice(tokenPnL.costBasis, true) : '—'}
									</Text>
								</DataTable.Cell>

								{/* Current Value Column */}
								<DataTable.Cell numeric style={styles.valueColumnCenter}>
									<Text style={styles.tokenValue}>{formatUsdAmount(tokenPnL.currentValue, true)}</Text>
								</DataTable.Cell>

								{/* P&L Column (USD and %) */}
								<DataTable.Cell numeric style={styles.pnlColumnCenter}>
									<View style={styles.pnlContainer}>
										<Text style={[
											styles.pnlUsdText,
											isEssentiallyZero ? styles.neutralText : (isPositive ? styles.positiveText : styles.negativeText)
										]}>
											{isEssentiallyZero ? '$0.00' : `${isPositive ? '+' : ''}${formatUsdAmount(tokenPnL.unrealizedPnl, true)}`}
										</Text>
										<Text style={[
											styles.pnlPercentText,
											isEssentiallyZero ? styles.neutralSmallText : (isPositive ? styles.positiveSmallText : styles.negativeSmallText)
										]}>
											{isEssentiallyZero ? '0.00%' : `${formatPercentage(percentageValue, 2, true)}`}
										</Text>
									</View>
								</DataTable.Cell>

								{/* Allocation Column */}
								<DataTable.Cell numeric style={styles.allocationColumnCenter}>
									<Text style={styles.allocationText}>
										{formatPercentage(allocationPercent, 1, false)}
									</Text>
								</DataTable.Cell>
							</DataTable.Row>
						);
					})}
				</DataTable>
			</View>
		</ScrollView>
	);
};

export default PnLView;
