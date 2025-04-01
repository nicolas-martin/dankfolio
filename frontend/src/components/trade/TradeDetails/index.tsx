import React from 'react';
import { View, Text } from 'react-native';
import { TradeDetailsProps } from './tradedetails_types';
import { styles } from './tradedetails_styles';
import { formatExchangeRate, formatPriceImpactPct } from './tradedetails_scripts';

const TradeDetails: React.FC<TradeDetailsProps> = ({
	exchangeRate: exchangeRate,
	totalFee: totalFee,
	priceImpactPct: priceImpactPct,
}) => {
	return (
		<View style={styles.container}>
			<Text style={styles.exchangeRate}>{formatExchangeRate(exchangeRate)}</Text>
			<Text style={styles.feeDetail}>{formatPriceImpactPct(priceImpactPct)}</Text>
			<Text style={styles.feeDetail}>Total Fee: {totalFee} SOL</Text>
		</View>
	);
};

export default TradeDetails;
