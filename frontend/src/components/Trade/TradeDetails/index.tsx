import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { TradeDetailsProps } from './tradedetails_types';
import { useStyles } from './tradedetails_styles';
import { 
	formatExchangeRate, 
	formatPriceImpactPct, 
	formatSolAmount, 
	formatTotalSolRequired,
	hasSolFeeBreakdown,
	isAccountCreationMajorCost
} from './tradedetails_scripts';

const TradeDetails: React.FC<TradeDetailsProps> = ({
	exchangeRate,
	totalFee,
	priceImpactPct,
	route,
	solFeeBreakdown,
	totalSolRequired,
	tradingFeeSol,
}) => {
	const styles = useStyles();

	// Use the comprehensive SOL requirement if available, otherwise fall back to totalFee
	const displayTotalFee = totalSolRequired || totalFee;
	const showDetailedBreakdown = hasSolFeeBreakdown(solFeeBreakdown);
	const accountCreationIsMajorCost = isAccountCreationMajorCost(solFeeBreakdown);

	return (
		<View style={styles.container}>
			<Text variant="bodyMedium" style={styles.exchangeRate}>
				{formatExchangeRate(exchangeRate)}
			</Text>
			<Text variant="bodySmall" style={styles.feeDetail}>
				{formatPriceImpactPct(priceImpactPct)}
			</Text>
			
			{/* Show detailed SOL fee breakdown if available */}
			{showDetailedBreakdown && solFeeBreakdown ? (
				<View style={styles.feeBreakdownContainer}>
					<Text variant="bodyMedium" style={styles.totalFeeHeader}>
						{formatTotalSolRequired(displayTotalFee)}
					</Text>
					
					{/* Fee breakdown details */}
					<View style={styles.feeBreakdownDetails}>
						{parseFloat(solFeeBreakdown.tradingFee) > 0 && (
							<Text variant="bodySmall" style={styles.feeBreakdownItem}>
								• Trading: {formatSolAmount(solFeeBreakdown.tradingFee)}
							</Text>
						)}
						
						{parseFloat(solFeeBreakdown.transactionFee) > 0 && (
							<Text variant="bodySmall" style={styles.feeBreakdownItem}>
								• Transaction: {formatSolAmount(solFeeBreakdown.transactionFee)}
							</Text>
						)}
						
						{parseFloat(solFeeBreakdown.accountCreationFee) > 0 && (
							<Text variant="bodySmall" style={[
								styles.feeBreakdownItem,
								accountCreationIsMajorCost && styles.majorCostItem
							]}>
								• Account creation: {formatSolAmount(solFeeBreakdown.accountCreationFee)}
								{solFeeBreakdown.accountsToCreate > 0 && 
									` (${solFeeBreakdown.accountsToCreate} account${solFeeBreakdown.accountsToCreate > 1 ? 's' : ''})`
								}
							</Text>
						)}
						
						{parseFloat(solFeeBreakdown.priorityFee) > 0 && (
							<Text variant="bodySmall" style={styles.feeBreakdownItem}>
								• Priority: {formatSolAmount(solFeeBreakdown.priorityFee)}
							</Text>
						)}
					</View>
					
					{/* Helpful note for account creation costs */}
					{accountCreationIsMajorCost && (
						<Text variant="bodySmall" style={styles.helpText}>
							💡 Most cost is for creating new token accounts (one-time setup)
						</Text>
					)}
				</View>
			) : (
				/* Fallback to simple fee display */
				<Text variant="bodySmall" style={styles.feeDetail}>
					Total Fee: {formatSolAmount(displayTotalFee)}
				</Text>
			)}
			
			{route && (
				<Text variant="bodySmall" style={styles.feeDetail}>
					Route: {route}
				</Text>
			)}
		</View>
	);
};

export default TradeDetails;
