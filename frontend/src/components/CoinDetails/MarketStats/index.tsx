import React from 'react';
import { View } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { MarketStatsProps } from './types';
import { useStyles } from './styles';
import { formatNumber, formatPercentage } from '@/utils/numberFormat';

const MarketStats: React.FC<MarketStatsProps> = ({ coin }) => {
	const styles = useStyles();

	// Pre-create style arrays to avoid JSX warnings
	const positiveChangeStyles = [styles.statChange, styles.statChangePositive];
	const negativeChangeStyles = [styles.statChange, styles.statChangeNegative];

	const renderStatItem = (
		icon: string,
		label: string,
		value: string | number | undefined,
		change?: number,
		testID?: string
	) => {
		if (value === undefined || value === null) return null;

		const formattedValue = typeof value === 'number' ? formatNumber(value, true) : value;
		const hasChange = change !== undefined && change !== null && !isNaN(change);
		
		// Special case: if value is empty string and we have a change, show only the colored change
		const isChangeOnly = value === '' && hasChange;

		return (
			<View style={styles.statItem} testID={testID}>
				<View style={styles.statHeader}>
					<View style={styles.statIcon}>
						<Icon source={icon} size={16} color={styles.colors.onSurfaceVariant} />
					</View>
					<Text style={styles.statLabel}>{label}</Text>
				</View>
				<View style={styles.statValueContainer}>
					{isChangeOnly ? (
						<Text style={change >= 0 ? positiveChangeStyles : negativeChangeStyles}>
							{formatPercentage(change)}
						</Text>
					) : (
						<>
							<Text style={styles.statValue}>{formattedValue}</Text>
							{hasChange && (
								<Text style={change >= 0 ? positiveChangeStyles : negativeChangeStyles}>
									{formatPercentage(change)}
								</Text>
							)}
						</>
					)}
				</View>
			</View>
		);
	};

	return (
		<View style={styles.container} testID="market-stats-container">
			<View style={styles.header}>
				<View style={styles.headerIcon}>
					<Icon source="chart-box-outline" size={16} color={styles.colors.onSecondaryContainer} />
				</View>
				<Text style={styles.headerTitle} testID="market-stats-title">Market Statistics</Text>
			</View>

			<View style={styles.statsGrid}>
				{renderStatItem(
					'currency-usd',
					'Market Cap',
					coin.marketcap,
					undefined,
					'market-stats-marketcap'
				)}

				{renderStatItem(
					'chart-line',
					'24h Volume',
					coin.volume24hUSD,
					coin.volume24hChangePercent,
					'market-stats-volume'
				)}

				{renderStatItem(
					'water',
					'Liquidity',
					coin.liquidity,
					undefined,
					'market-stats-liquidity'
				)}

				{renderStatItem(
					'diamond-stone',
					'FDV',
					coin.fdv,
					undefined,
					'market-stats-fdv'
				)}

				{renderStatItem(
					'trophy-outline',
					'Rank',
					coin.rank ? `#${coin.rank}` : undefined,
					undefined,
					'market-stats-rank'
				)}

				{renderStatItem(
					'percent-outline',
					'24h Change',
					'', // Empty value since the change will be displayed
					coin.price24hChangePercent,
					'market-stats-price-change'
				)}
			</View>
		</View>
	);
};

export default MarketStats; 
