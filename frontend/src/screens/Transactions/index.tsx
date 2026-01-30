import { SafeAreaView, View } from 'react-native';
import { useStyles } from './transactions_styles';
import TransactionsList from '@/components/Profile/TransactionsList';
import ScreenHeader from '@/components/Common/ScreenHeader';

const Transactions = () => {
	const styles = useStyles();

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				<ScreenHeader
					title="Transactions"
					showRightAction={false}
				/>
				<View style={styles.listWrapper}>
					<TransactionsList />
				</View>
			</View>
		</SafeAreaView>
	);
};

export default Transactions;
