import React from 'react';
import { View, Text } from 'react-native';
import { TradeDetailsProps } from './types';
import { styles } from './styles';

const TradeDetails: React.FC<TradeDetailsProps> = ({
  exchangeRate,
  gasFee,
  spread,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.exchangeRate}>Rate: {exchangeRate}</Text>
      <Text style={styles.feeDetail}>Network Fee: {gasFee} SOL</Text>
      <Text style={styles.feeDetail}>Price Impact: {spread}%</Text>
    </View>
  );
};

export default TradeDetails; 