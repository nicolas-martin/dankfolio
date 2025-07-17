import { View, Text, FlatList } from 'react-native';
import { useTransactionsStore } from '@/store/transactions';
import { Transaction } from '@/types';

const TransactionsList = () => {
	const { transactions, isLoading, error } = useTransactionsStore();

	const renderItem = ({ item }: { item: Transaction }) => (
		<View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
			<View>
				<Text style={{ fontSize: 16, fontWeight: 'bold' }}>{item.type}</Text>
				<Text style={{ fontSize: 12, color: '#888' }}>{new Date(item.date).toLocaleDateString()}</Text>
			</View>
			<Text style={{ fontSize: 16, fontWeight: 'bold' }}>
				{item.amount} {item.fromCoinSymbol}
			</Text>
		</View>
	);

	if (isLoading) {
		return <Text>Loading transactions...</Text>;
	}

	if (error) {
		return <Text>Error fetching transactions: {error}</Text>;
	}

	return (
		<FlatList
			data={transactions}
			renderItem={renderItem}
			keyExtractor={(item) => item.id}
		/>
	);
};

export default TransactionsList;
