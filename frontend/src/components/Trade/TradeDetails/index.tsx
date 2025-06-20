import React, { useState, useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Text, List, Card } from 'react-native-paper';
import { TradeDetailsProps } from './tradedetails_types';
import { useStyles } from './tradedetails_styles';
import {
	formatPriceImpactPct,
	formatSolAmount,
	formatTotalSolRequired,
	hasSolFeeBreakdown,
	isAccountCreationMajorCost
} from './tradedetails_scripts';

const TradeDetails: React.FC<TradeDetailsProps> = ({
	totalFee,
	priceImpactPct,
	route,
	solFeeBreakdown,
	totalSolRequired,
}) => {
	const styles = useStyles();
	const [expanded, setExpanded] = useState(false);

	// Memoize calculated values to prevent unnecessary re-renders
	const displayTotalFee = useMemo(() => totalSolRequired || totalFee, [totalSolRequired, totalFee]);
	const showDetailedBreakdown = useMemo(() => hasSolFeeBreakdown(solFeeBreakdown), [solFeeBreakdown]);
	const accountCreationIsMajorCost = useMemo(() => isAccountCreationMajorCost(solFeeBreakdown), [solFeeBreakdown]);

	const accordionKey = useMemo(() => `fee-breakdown-${expanded}`, [expanded]);

	// Memoize combined styles to avoid creating new arrays
	const accountCreationTitleStyle = useMemo(() =>
		accountCreationIsMajorCost ?
			[styles.feeBreakdownItem, styles.majorCostItem] :
			styles.feeBreakdownItem,
		[accountCreationIsMajorCost, styles.feeBreakdownItem, styles.majorCostItem]
	);

	const handlePress = useCallback(() => {
		setExpanded(!expanded);
	}, [expanded]);

	return (
		// <Card style={styles.container}>
		<Card >
			<Text variant="bodySmall" style={styles.feeDetail}>
				{formatPriceImpactPct(priceImpactPct)}
			</Text>

			{/* Show detailed SOL fee breakdown if available */}
			{showDetailedBreakdown && solFeeBreakdown ? (
				// <View style={styles.feeBreakdownContainer}>
				<View style={styles.feeBreakdownContainer}>
					<List.Accordion
						key={accordionKey}
						title={formatTotalSolRequired(displayTotalFee)}
						description="Tap to see fee breakdown"
						titleStyle={styles.accordionTitle}
						descriptionStyle={styles.accordionDescription}
						style={styles.accordionContainer}
						expanded={expanded}
						onPress={handlePress}
						testID="fee-breakdown-accordion"
					>
						{/* Fee breakdown details */}
						{parseFloat(solFeeBreakdown.tradingFee) > 0 && (
							<List.Item
								title={`Trading: ${formatSolAmount(solFeeBreakdown.tradingFee)}`}
								titleStyle={styles.feeBreakdownItem}
								style={styles.listItemStyle}
							/>
						)}

						{parseFloat(solFeeBreakdown.transactionFee) > 0 && (
							<List.Item
								title={`Transaction: ${formatSolAmount(solFeeBreakdown.transactionFee)}`}
								titleStyle={styles.feeBreakdownItem}
								style={styles.listItemStyle}
							/>
						)}

						{parseFloat(solFeeBreakdown.accountCreationFee) > 0 && (
							<List.Item
								title={`Account creation: ${formatSolAmount(solFeeBreakdown.accountCreationFee)}${solFeeBreakdown.accountsToCreate > 0
									? ` (${solFeeBreakdown.accountsToCreate} account${solFeeBreakdown.accountsToCreate > 1 ? 's' : ''})`
									: ''
									}`}
								titleStyle={accountCreationTitleStyle}
								style={styles.listItemStyle}
							/>
						)}

						{parseFloat(solFeeBreakdown.priorityFee) > 0 && (
							<List.Item
								title={`Priority: ${formatSolAmount(solFeeBreakdown.priorityFee)}`}
								titleStyle={styles.feeBreakdownItem}
								style={styles.listItemStyle}
							/>
						)}

						{/* Helpful note for account creation costs */}
						{accountCreationIsMajorCost && (
							<List.Item
								title="💡 Most cost is for creating new token accounts (one-time setup)"
								titleStyle={styles.helpText}
								style={styles.listItemStyle}
							/>
						)}
					</List.Accordion>
				</View>
			) : (
				<Text variant="bodySmall" style={styles.feeDetail}>
					Total Fee: {formatSolAmount(displayTotalFee)}
				</Text>
			)}

			{route && (
				<Text variant="bodySmall" style={styles.feeDetail}>
					Route: {route}
				</Text>
			)}
		</Card>
	);
};

// export default React.memo(TradeDetails);
export default TradeDetails;
