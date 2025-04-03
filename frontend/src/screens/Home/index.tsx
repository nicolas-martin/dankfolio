import React, { useCallback } from 'react';
import { View, SafeAreaView, FlatList } from 'react-native';
import { useTheme, Button, IconButton, Text } from 'react-native-paper';
import CoinCard from '../../components/Home/CoinCard';
import { useNavigation } from '@react-navigation/native';
import { handleCoinPress } from './home_scripts';
import { HomeScreenNavigationProp } from './home_types';
import { usePortfolioStore } from '../../store/portfolio';
import { useCoinStore } from '../../store/coins';
import { useToast } from '../../components/Common/Toast';
import { createStyles } from './home_styles';
import { Coin } from '../../types';

const HomeScreen = () => {
	const navigation = useNavigation<HomeScreenNavigationProp>();
	const { wallet } = usePortfolioStore();
	const { availableCoins: coins, fetchAvailableCoins: fetchCoins } = useCoinStore();
	const { showToast } = useToast();
	const theme = useTheme();
	const styles = createStyles(theme);

	const handleCoinPressCallback = useCallback((coin: Coin) => {
		handleCoinPress(coin, navigation);
	}, [navigation]);

	const onRefresh = useCallback(async () => {
		try {
			await fetchCoins();
			showToast({
				type: 'success',
				message: 'Coins refreshed successfully!',
				duration: 3000
			});
		} catch (error) {
			showToast({
				type: 'error',
				message: 'Failed to refresh coins',
				duration: 3000
			});
		}
	}, [fetchCoins, showToast]);

	return (
		<SafeAreaView style={styles.container}>
			{wallet ? (
				<View style={styles.content}>
					<View style={styles.coinsSection}>
						<View style={styles.sectionHeader}>
							<Text variant="titleLarge" style={styles.sectionTitle}>Available Coins</Text>
							<IconButton
								icon="refresh"
								size={24}
								onPress={onRefresh}
							/>
						</View>
						{coins.length > 0 ? (
							<FlatList
								data={coins}
								keyExtractor={(item) => item.id || item.symbol}
								renderItem={({ item }) => (
									<CoinCard coin={item} onPress={() => handleCoinPressCallback(item)} />
								)}
								contentContainerStyle={styles.coinsList}
								showsVerticalScrollIndicator={false}
							/>
						) : (
							<View style={styles.noCoinsContainer}>
								<Text variant="bodyMedium" style={styles.noCoinsText}>No coins available for trading</Text>
							</View>
						)}
					</View>
					<View style={styles.profileContainer}>
						<Button
							mode="contained"
							onPress={() => navigation.navigate('Profile')}
						>
							View Profile
						</Button>
					</View>
				</View>
			) : (
				<View style={styles.content}>
					<View style={styles.centerContainer}>
						<Text variant="bodyLarge" style={styles.loadingText}>Please connect your wallet</Text>
					</View>
				</View>
			)}
		</SafeAreaView>
	);
};

export default HomeScreen;

