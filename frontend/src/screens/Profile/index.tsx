import { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, SafeAreaView } from 'react-native';
import { Text, useTheme, IconButton, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { handleTokenPress, copyToClipboard, formatAddress, sortTokensByValue } from './profile_scripts';
import { CoinDetailScreenNavigationProp } from '@screens/CoinDetail/coindetail_types';
import { usePortfolioStore } from '@store/portfolio';
import { createStyles } from './profile_styles';
import { TokenCard } from './TokenCard';
import {
	ProfileIcon,
	WalletIcon,
	CoinsIcon,
	SendIcon
} from '@components/Common/Icons';

const Profile = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const { showToast } = useToast();
	const { wallet, tokens, fetchPortfolioBalance, isLoading } = usePortfolioStore();
	const theme = useTheme();
	const styles = createStyles(theme);

	const [isRefreshing, setIsRefreshing] = useState(false);

	const totalValue = useMemo(() => {
		return tokens.reduce((sum, token) => sum + token.value, 0);
	}, [tokens]);

	const sortedTokens = useMemo(() => {
		return sortTokensByValue(tokens);
	}, [tokens]);

	const handleRefresh = async () => {
		if (!wallet) return;
		setIsRefreshing(true);
		try {
			await fetchPortfolioBalance(wallet.address);
		} catch (error) {
			showToast({
				message: 'Error refreshing portfolio',
				type: 'error'
			});
		} finally {
			setIsRefreshing(false);
		}
	};

	if (!wallet || tokens.length === 0) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
					<WalletIcon size={48} color={theme.colors.onSurfaceVariant} />
					<Text
						variant="titleLarge"
						style={{ color: theme.colors.onSurface, marginTop: 16 }}
					>
						No wallet data available
					</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={[styles.container, { backgroundColor: theme.colors.background }]}>
				<ScrollView
					contentContainerStyle={styles.scrollContent}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing || isLoading}
							onRefresh={handleRefresh}
							colors={[theme.colors.primary]}
							tintColor={theme.colors.primary}
						/>
					}
				>
					<View style={styles.contentPadding}>
						<View style={styles.profileHeaderRow}>
							<ProfileIcon size={32} color={theme.colors.onSurface} />
							<View style={styles.profileHeaderTextContainer}>
								<Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
									Profile
								</Text>
								<View style={{ flexDirection: 'row', alignItems: 'center' }}>
									<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
										{formatAddress(wallet.address)}
									</Text>
									<IconButton
										icon="content-copy"
										size={16}
										onPress={() => copyToClipboard(wallet.address, 'Wallet', showToast)}
										style={{ margin: 0, padding: 0, marginLeft: 4 }}
									/>
								</View>
							</View>
						</View>

						<View style={[styles.card, styles.portfolioValueCard, { backgroundColor: theme.colors.surfaceVariant }]}>
							<Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
								Portfolio Value
							</Text>
							<Text variant="displaySmall" style={{ color: theme.colors.onSurface }}>
								${totalValue.toFixed(2)}
							</Text>
							<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
								{tokens.length} Token{tokens.length !== 1 ? 's' : ''}
							</Text>
							<Button
								mode="contained"
								icon={() => <SendIcon size={20} color={theme.colors.onPrimary} />}
								onPress={() => navigation.navigate('SendTokens')}
								style={{ marginTop: 16 }}
							>
								Send Tokens
							</Button>
						</View>

						<View>
							<View style={styles.yourTokensHeader}>
								<CoinsIcon size={24} color={theme.colors.onSurface} />
								<Text
									variant="titleLarge"
									style={[styles.tokenHeaderText, { color: theme.colors.onSurface }]}
								>
									Your Tokens
								</Text>
							</View>

							{sortedTokens.map((token) => (
								<TokenCard
									key={token.id}
									profileCoin={token}
									onPress={() => handleTokenPress(token.coin, navigation.navigate)}
								/>
							))}
						</View>
					</View>
				</ScrollView>
			</View>
		</SafeAreaView>
	);
};
export default Profile;

