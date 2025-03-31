import React from 'react';
import { View, Text } from 'react-native';
import { TradeDetailsProps } from './tradedetails_types';
import { styles } from './tradedetails_styles';
import { formatExchangeRate, formatGasFee, formatSpread } from './tradedetails_scripts';

const TradeDetails: React.FC<TradeDetailsProps> = ({
	exchangeRate,
	gasFee,
	spread,
	total,
}) => {
	return (
		<View style={styles.container}>
			<Text style={styles.exchangeRate}>{formatExchangeRate(exchangeRate)}</Text>
			<Text style={styles.feeDetail}>{formatGasFee(gasFee)}</Text>
			<Text style={styles.feeDetail}>{formatSpread(spread)}</Text>
			<Text style={styles.feeDetail}>Total Fee: {total} SOL</Text>
		</View>
	);
};

export default TradeDetails;
