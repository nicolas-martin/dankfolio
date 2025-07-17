import { View, Text } from 'react-native';
import { useTransactionsStore } from '@/store/transactions';
import { Transaction } from '@/types';
import { useStyles } from './transactionslist_styles';

const TransactionsList = () => {
	const { transactions, isLoading, error } = useTransactionsStore();
	const styles = useStyles();

	const renderItem = (item: Transaction) => (
		<View key={item.id} style={styles.transactionItem}>
			<View>
				<Text style={styles.transactionType}>{item.type}</Text>
				<Text style={styles.transactionDate}>{new Date(item.date).toLocaleDateString()}</Text>
			</View>
			<Text style={styles.transactionAmount}>
				{item.amount} {item.fromCoinSymbol}
			</Text>
		</View>
	);

	if (isLoading) {
		return <Text style={styles.loadingText}>Loading transactions...</Text>;
	}

	if (error) {
		return <Text style={styles.errorText}>Error fetching transactions: {error}</Text>;
	}

	return (
		<View>
			{transactions.map(renderItem)}
		</View>
	);
};

export default TransactionsList;