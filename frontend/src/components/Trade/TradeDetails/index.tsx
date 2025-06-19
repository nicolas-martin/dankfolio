import React from 'react';
import { View } from 'react-native';
import { Text, List, Icon } from 'react-native-paper';
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
	const [expanded, setExpanded] = React.useState(false);

	// Use the comprehensive SOL requirement if available, otherwise fall back to totalFee
	const displayTotalFee = totalSolRequired || totalFee;
	const showDetailedBreakdown = hasSolFeeBreakdown(solFeeBreakdown);
	const accountCreationIsMajorCost = isAccountCreationMajorCost(solFeeBreakdown);

	const handlePress = () => setExpanded(!expanded);

	return (
		<View style={styles.container}>
			<Text variant="bodySmall" style={styles.feeDetail}>
				{formatPriceImpactPct(priceImpactPct)}
			</Text>

			{/* Show detailed SOL fee breakdown if available */}
			{showDetailedBreakdown && solFeeBreakdown ? (
				<List.Section style={styles.feeBreakdownContainer}>
					<List.Accordion
						title={formatTotalSolRequired(displayTotalFee)}
						description="Tap to see fee breakdown"
						titleStyle={styles.accordionTitle}
						descriptionStyle={styles.accordionDescription}
						style={styles.accordionContainer}
						expanded={expanded}
						onPress={handlePress}
						right={({ isExpanded }) => (
							<Icon 
								source={isExpanded ? "chevron-up" : "chevron-down"} 
								size={20}
								color={styles.colors.onSurface}
							/>
						)}
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
								title={`Account creation: ${formatSolAmount(solFeeBreakdown.accountCreationFee)}${
									solFeeBreakdown.accountsToCreate > 0 
										? ` (${solFeeBreakdown.accountsToCreate} account${solFeeBreakdown.accountsToCreate > 1 ? 's' : ''})`
										: ''
								}`}
								titleStyle={[
									styles.feeBreakdownItem,
									accountCreationIsMajorCost && styles.majorCostItem
								]}
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
				</List.Section>
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
