import { View, ScrollView, RefreshControl } from 'react-native';
import { Text, IconButton, DataTable } from 'react-native-paper';
import { usePortfolioStore } from '@/store/portfolio';
import { useStyles } from './pnlview_styles';
import { formatTokenBalance, formatPercentage, formatPrice } from '@/utils/numberFormat';
import { useCallback, useState, useMemo } from 'react';
import { fetchPortfolioPnL } from './pnlview_scripts';
import { useEffect } from 'react';
import type { TokenPnL } from '@/services/grpc/model';
import CachedImage from '@/components/Common/CachedImage';

const PnLView = () => {
	const { tokens, fetchPortfolioBalance, wallet } = usePortfolioStore();
	const styles = useStyles();
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [pnlData, setPnlData] = useState<TokenPnL[] | null>(null);
	const [isLoadingPnL, setIsLoadingPnL] = useState(false);

	const refreshControlColors = useMemo(() => [styles.colors.primary], [styles.colors.primary]);

	// Fetch PnL data from backend when wallet changes
	useEffect(() => {
		if (wallet?.address) {
			const loadPnLData = async () => {
				setIsLoadingPnL(true);
				try {
					const response = await fetchPortfolioPnL(wallet.address);
					if (response?.tokenPnls) {
						const sortedPnLs = [...response.tokenPnls].sort((a, b) => b.unrealizedPnl - a.unrealizedPnl);
						setPnlData(sortedPnLs);
					}
				} finally {
					setIsLoadingPnL(false);
				}
			};
			loadPnLData();
		}
	}, [wallet?.address]);

	const handleRefresh = useCallback(async () => {
		if (!wallet?.address) return;
		setIsRefreshing(true);
		try {
			await fetchPortfolioBalance(wallet.address, true);
			// Also refresh PnL data
			const response = await fetchPortfolioPnL(wallet.address);
			if (response?.tokenPnls) {
				const sortedPnLs = [...response.tokenPnls].sort((a, b) => b.unrealizedPnl - a.unrealizedPnl);
				setPnlData(sortedPnLs);
			}
		} finally {
			setIsRefreshing(false);
		}
	}, [wallet?.address, fetchPortfolioBalance]);

	// Only show PnL data if loaded from backend
	const displayData = pnlData || [];

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

	if (isLoadingPnL) {
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
				<DataTable>
					<DataTable.Header style={styles.tableHeader}>
						<DataTable.Title style={styles.symbolColumn}>
							<Text style={styles.headerText}>SYMBOL</Text>
						</DataTable.Title>
						<DataTable.Title numeric sortDirection='descending' style={styles.valueColumn}>
							<Text style={styles.headerText}>VALUE</Text>
						</DataTable.Title>
						<DataTable.Title numeric style={styles.gainColumn}>
							<Text style={styles.headerText}>GAIN</Text>
						</DataTable.Title>
						<DataTable.Title style={styles.arrowColumn}>{/* Empty for chevron */}</DataTable.Title>
					</DataTable.Header>

					{displayData.map((tokenPnL, index) => {
						// Check if P&L is essentially zero (very small number)
						// Backend returns decimal values (0.25 for 25%)
						const percentageValue = tokenPnL.pnlPercentage * 100;
						const isEssentiallyZero = Math.abs(percentageValue) < 0.01; // 0.01% threshold
						const isPositive = !isEssentiallyZero && tokenPnL.pnlPercentage > 0;

						return (
							<DataTable.Row
								key={tokenPnL.coinId}
								style={[styles.tableRow, index === displayData.length - 1 && styles.lastRow]}
							>
								<DataTable.Cell style={styles.symbolColumnStart}>
									<View style={styles.symbolCellContent}>
										<View style={styles.tokenInfoContainer}>
											<Text style={styles.tokenSymbol}>{tokenPnL.symbol}</Text>
											{/* Find matching token for logo */}
											{(() => {
												const matchingToken = tokens.find(t => t.mintAddress === tokenPnL.coinId);
												return matchingToken ? (
													<CachedImage
														uri={matchingToken.coin.logoURI}
														style={styles.tokenIcon}
														testID={`pnl-token-icon-${tokenPnL.symbol}`}
													/>
												) : (
													<View style={styles.tokenIcon} />
												);
											})()}
											<Text style={styles.tokenAmount}>{formatTokenBalance(tokenPnL.amountHeld)}</Text>
										</View>
									</View>
								</DataTable.Cell>
								<DataTable.Cell numeric style={styles.valueColumnCenter}>
									<Text style={styles.tokenValue}>{formatPrice(tokenPnL.currentValue, true)}</Text>
								</DataTable.Cell>
								<DataTable.Cell numeric style={styles.gainColumnCenter}>
									<View style={[styles.gainBadge, isEssentiallyZero ? styles.gainBadgeNeutral : (isPositive ? styles.gainBadgePositive : styles.gainBadgeNegative)]}>
										<Text style={[styles.gainText, isEssentiallyZero ? styles.gainTextNeutral : (isPositive ? styles.gainTextPositive : styles.gainTextNegative)]}>
											{isEssentiallyZero ? '—' : (isPositive ? '↑' : '↓')} {isEssentiallyZero ? '0.00%' : formatPercentage(Math.abs(percentageValue), 2, false)}
										</Text>
									</View>
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
