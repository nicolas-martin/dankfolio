import { useMemo, useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, SafeAreaView } from 'react-native'; // Removed TouchableOpacity
import { Text, IconButton, Button, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { handleTokenPress, formatAddress, sortTokensByValue } from './profile_scripts';
import CopyToClipboard from '@/components/Common/CopyToClipboard';
import { usePortfolioStore } from '@store/portfolio';
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

const Profile = () => {
	const navigation = useNavigation<ProfileScreenNavigationProp>();
	const { showToast } = useToast();
	const { wallet, tokens, fetchPortfolioBalance, isLoading: isPortfolioLoading } = usePortfolioStore();
	const {
		isLoading: isTransactionsLoading,
		fetchRecentTransactions,
		hasFetched: transactionsHasFetched
	} = useTransactionsStore();
	const styles = useStyles();


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
		return tokens.reduce((sum, token) => sum + token.value, 0);
	}, [tokens]);

	const sortedTokens = useMemo(() => {
		return sortTokensByValue(tokens);
	}, [tokens]);

	const handleRefresh = async () => {
		if (!wallet) return;
		logger.breadcrumb({ category: 'profile', message: 'Portfolio refresh initiated from ProfileScreen' });
		setIsRefreshing(true);
		try {
			await fetchPortfolioBalance(wallet.address);
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
					{/* Removed TouchableOpacity wrapper */}
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
					<CopyToClipboard text={wallet.address} testID="copy-wallet-button">
						<IconButton
							icon="content-copy"
							size={16}
							style={styles.copyButton}
							accessible={true}
						/>
					</CopyToClipboard>
				</View>
			)}
		</View>
	);

	const renderPortfolioCard = () => (
		<View style={styles.portfolioCard} accessible={false}>
			<View style={styles.portfolioHeader} accessible={false}>
				<Text style={styles.portfolioTitle} accessible={true}>Total Portfolio Value</Text>
				<Text style={styles.portfolioValue} accessible={true}>
					${totalValue.toFixed(2)}
				</Text>
				<Text style={styles.portfolioSubtext} accessible={true}>
					{tokens.length} Token{tokens.length !== 1 ? 's' : ''}
				</Text>
			</View>
			<Button
				mode="contained"
				icon={() => <SendIcon size={20} color={styles.colors.onPrimary} />}
				onPress={() => {
					logger.breadcrumb({ category: 'navigation', message: 'Navigating to SendTokensScreen from Profile' });
					navigation.navigate('SendTokens');
				}}
				style={[styles.sendButton, tokens.length === 0 && styles.sendButtonDisabled]}
				contentStyle={styles.sendButtonContent}
				disabled={tokens.length === 0}
				accessible={true}
				testID="send-tokens-button"
			>
				Send Tokens
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
						Your wallet doesn't contain any tokens yet. Start trading to build your portfolio!
					</Text>
				</View>
			) : (
				sortedTokens.map((token) => (
					<CoinCard
						key={token.mintAddress}
						showSparkline={false}
						coin={{
							...token.coin,
							value: token.value,
							balance: token.amount
						}}
						onPress={() => {
							logger.breadcrumb({
								category: 'ui',
								message: 'Pressed token card on ProfileScreen',
								data: { tokenSymbol: token.coin.symbol, tokenMint: token.coin.mintAddress }
							});
							handleTokenPress(token.coin, navigation.navigate);
						}}
					/>
				))
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
				<View style={[styles.container, styles.centered]}>
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
							colors={[styles.colors.primary]}
							tintColor={styles.colors.primary}
						/>
					}
				>
					<View style={styles.contentPadding} accessible={false}>
						{renderHeader()}
						{renderPortfolioCard()}
						{renderTokensSection()}
						{/* {renderThemeToggle()} */}
						{/* Commenting out renderThemeToggle as it's moved to Settings screen */}
						{/* {renderTransactionsSection()} */}
					</View>

				</ScrollView>
				{/* Removed ProfilePictureModal instance */}
			</View>
		</SafeAreaView>
	);
};

export default Profile;
