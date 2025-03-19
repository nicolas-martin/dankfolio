import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface TradeDetailsProps {
  exchangeRate: string;
  gasFee: string;
  spread: string;
}

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

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
  },
  exchangeRate: {
    color: '#fff',
    marginBottom: 10,
  },
  feeDetail: {
    color: '#9F9FD5',
    marginBottom: 5,
  },
});

export default TradeDetails; 