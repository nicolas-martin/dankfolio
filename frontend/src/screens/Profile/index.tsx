import { useMemo, useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, SafeAreaView } from 'react-native';
import { Text, Button, Icon, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { 
	handleTokenPress, 
	formatAddress, 
	sortTokensByValue, 
	calculateTotalPortfolioValue,
	createCoinCardProps 
} from './profile_scripts';
import CopyToClipboard from '@/components/Common/CopyToClipboard';
import { usePortfolioStore, PortfolioToken } from '@store/portfolio';
import { useTransactionsStore } from '@/store/transactions';
import { useStyles } from './profile_styles';
import CoinCard from '@/components/Home/CoinCard';
import {
	ProfileIcon,
	WalletIcon,
	CoinsIcon,
	SendIcon,
} from '@components/Common/Icons';
import { logger } from '@/utils/logger';
import type { ProfileScreenNavigationProp } from './profile_types';
import { formatPrice } from 'utils/numberFormat';

const Profile = () => {
	const navigation = useNavigation<ProfileScreenNavigationProp>();
	const { showToast } = useToast();
	const { wallet, tokens, fetchPortfolioBalance, isLoading: isPortfolioLoading } = usePortfolioStore();
	const styles = useStyles();



	const sendButtonIcon = useCallback(() => (
		<SendIcon size={20} color={styles.colors.onPrimary} />
	), [styles.colors.onPrimary]);



	const {
		isLoading: isTransactionsLoading,
		fetchRecentTransactions,
		hasFetched: transactionsHasFetched
	} = useTransactionsStore();

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed ProfileScreen' });
	}, []);

	useEffect(() => {
		if (wallet?.address && !transactionsHasFetched) {
			logger.info('ProfileScreen: Wallet address available, fetching recent transactions.');
			fetchRecentTransactions(wallet.address, 5); // Fetch top 5 recent transactions
		}
	}, [wallet?.address, fetchRecentTransactions, transactionsHasFetched]);

	const [isRefreshing, setIsRefreshing] = useState(false);

	const totalValue = useMemo(() => {
		return calculateTotalPortfolioValue(tokens);
	}, [tokens]);

	const sortedTokens = useMemo(() => {
		return sortTokensByValue(tokens);
	}, [tokens]);

	const handleRefresh = async () => {
		if (!wallet) return;
		logger.breadcrumb({ category: 'profile', message: 'Portfolio refresh initiated from ProfileScreen' });
		setIsRefreshing(true);
		try {
			await fetchPortfolioBalance(wallet.address, true); // Force refresh to get updated prices
		} catch (error: unknown) {
			if (error instanceof Error) {
				showToast({
					message: `Error refreshing portfolio: ${error.message}`,
					type: 'error'
				});
			} else {
				showToast({
					message: 'An unknown error occurred while refreshing portfolio',
					type: 'error'
				});
			}
		} finally {
			setIsRefreshing(false);
		}
	};

	const renderHeader = () => (
		<View style={styles.headerSection} accessible={false}>
			<View style={styles.profileHeader} accessible={false}>
				<View style={styles.profileIconContainer} accessible={false}>
					<ProfileIcon size={28} color={styles.colors.onSurface} />
					<Text style={styles.profileTitle} accessible={true} testID="portfolio-title">Portfolio</Text>
				</View>
				<IconButton
					icon="cog-outline"
					size={24}
					iconColor={styles.colors.onSurface}
					onPress={() => {
						logger.breadcrumb({ category: 'navigation', message: 'Navigating to SettingsScreen from Profile' });
						navigation.navigate('Settings');
					}}
					style={styles.settingsButton}
					accessible={true}
					testID="settings-button"
				/>
			</View>
			{wallet && (
				<View style={styles.walletAddressContainer} accessible={false}>
					<Text style={styles.walletAddress} accessible={true}>
						{formatAddress(wallet.address)}
					</Text>
					<CopyToClipboard
						text={wallet.address}
						testID="copy-wallet-button"
					/>
				</View>
			)}
		</View>
	);

	const renderPortfolioCard = () => (
		<View style={styles.portfolioCard} accessible={false}>
			<View style={styles.portfolioHeader} accessible={false}>
				<Text style={styles.portfolioTitle} accessible={true}>Total Portfolio Value</Text>
				<Text style={styles.portfolioValue} accessible={true}>
					{formatPrice(totalValue, true)}
				</Text>
				<Text style={styles.portfolioSubtext} accessible={true}>
					{tokens.length} Token{tokens.length !== 1 ? 's' : ''}
				</Text>
			</View>
			<Button
				mode="contained"
				icon={sendButtonIcon}
				onPress={() => {
					logger.breadcrumb({ category: 'navigation', message: 'Navigating to SendTokensScreen from Profile' });
					navigation.navigate('SendTokens');
				}}
				{...styles.sendButtonStyle}
				contentStyle={styles.sendButtonContent}
				disabled={tokens.length === 0}
				accessible={true}
				testID="send-tokens-button"
			>
				<Text>Send Tokens</Text>
			</Button>
		</View>
	);

	const renderTokensSection = () => (
		<View style={styles.tokensSection} accessible={false}>
			<View style={styles.tokensHeader} accessible={false}>
				<View style={styles.tokensIcon}>
					<CoinsIcon size={24} color={styles.colors.onSurface} />
				</View>
				<Text style={styles.tokensTitle} accessible={true} testID="your-tokens-title">Your Tokens</Text>
			</View>

			{sortedTokens.length === 0 ? (
				<View style={styles.emptyStateContainer} accessible={false}>
					<View style={styles.emptyStateIcon}>
						<Icon source="wallet-outline" size={48} color={styles.colors.onSurfaceVariant} />
					</View>
					<Text style={styles.emptyStateTitle} accessible={true}>No Tokens Found</Text>
					<Text style={styles.emptyStateText} accessible={true}>
						Your wallet doesn&apos;t contain any tokens yet. Start trading to build your portfolio!
					</Text>
				</View>
			) : (
				sortedTokens.map((token) => {
					const coinCardCoinProp = createCoinCardProps(token);
					return (
						<CoinCard
							key={token.mintAddress}
							showSparkline={false}
							coin={coinCardCoinProp}
							onPressCoin={() => {
								logger.breadcrumb({
									category: 'ui',
									message: 'Pressed token card on ProfileScreen',
									data: { tokenSymbol: token.coin.symbol, tokenMint: token.coin.address }
								});
								handleTokenPress(token.coin, navigation.navigate);
							}}
						/>
					)
				})
			)}
		</View>
	);

	const renderNoWalletState = () => (
		<View style={styles.noWalletContainer}>
			<View style={styles.noWalletCard}>
				<View style={styles.noWalletIcon}>
					<WalletIcon size={48} color={styles.colors.primary} />
				</View>
				<Text style={styles.noWalletTitle}>No Wallet Connected</Text>
				<Text style={styles.noWalletText}>
					Connect your Solana wallet to view your portfolio and manage your tokens.
				</Text>
			</View>
		</View>
	);

	if (!wallet) {
		return (
			<SafeAreaView style={styles.safeArea}>
				<View style={styles.noWalletContainerStyle}>
					{renderNoWalletState()}
				</View>
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={styles.safeArea} accessible={false}>
			<View style={styles.container} accessible={false} testID="profile-screen">
				<ScrollView
					accessible={false}
					contentContainerStyle={styles.scrollContent}
					refreshControl={
						<RefreshControl
							refreshing={isRefreshing || isPortfolioLoading || isTransactionsLoading}
							onRefresh={handleRefresh}
							colors={styles.refreshControlColors}
							tintColor={styles.colors.primary}
						/>
					}
				>
					<View style={styles.contentPadding} accessible={false}>
						{renderHeader()}
						{renderPortfolioCard()}
						{renderTokensSection()}
					</View>
				</ScrollView>
			</View>
		</SafeAreaView>
	);
};

export default Profile;
