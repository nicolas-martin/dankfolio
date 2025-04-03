import React from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { TradeDetailsProps } from './tradedetails_types';
import { styles } from './tradedetails_styles';
import { formatExchangeRate, formatPriceImpactPct } from './tradedetails_scripts';

const TradeDetails: React.FC<TradeDetailsProps> = ({
	exchangeRate: exchangeRate,
	totalFee: totalFee,
	priceImpactPct: priceImpactPct,
	route,
}) => {
	return (
		<View style={styles.container}>
			<Text variant="bodyMedium" style={styles.exchangeRate}>{formatExchangeRate(exchangeRate)}</Text>
			<Text variant="bodySmall" style={styles.feeDetail}>{formatPriceImpactPct(priceImpactPct)}</Text>
			<Text variant="bodySmall" style={styles.feeDetail}>Total Fee: {totalFee} SOL</Text>
			{route && <Text variant="bodySmall" style={styles.feeDetail}>Route: {route}</Text>}
		</View>
	);
};

export default TradeDetails;
