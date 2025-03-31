import React from 'react';
import { View, Text } from 'react-native';
import { TradeDetailsProps } from './types';
import { styles } from './styles';
import { formatExchangeRate, formatGasFee, formatSpread } from './scripts';

const TradeDetails: React.FC<TradeDetailsProps> = ({
	exchangeRate,
	gasFee,
	spread,
}) => {
	return (
		<View style={styles.container}>
			<Text style={styles.exchangeRate}>{formatExchangeRate(exchangeRate)}</Text>
			<Text style={styles.feeDetail}>{formatGasFee(gasFee)}</Text>
			<Text style={styles.feeDetail}>{formatSpread(spread)}</Text>
		</View>
	);
};

export default TradeDetails;
