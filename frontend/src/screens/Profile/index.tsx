import { useMemo, useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, SafeAreaView, useWindowDimensions, Pressable } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { TabView, TabBar } from 'react-native-tab-view';
import { handleTokenPress, formatAddress, sortTokensByValue, createCoinCardProps } from './profile_scripts';
import CopyToClipboard from '@/components/Common/CopyToClipboard';
import { usePortfolioStore } from '@store/portfolio';
import { useStyles } from './profile_styles';
import TokenListCard from '@/components/Home/TokenListCard';
import TransactionsList from '@/components/Profile/TransactionsList';
import { ProfileIcon, WalletIcon, CoinsIcon, SendIcon, SettingsIcon, SwapIcon, ChartLineIcon } from '@components/Common/Icons';
import { logger } from '@/utils/logger';
import type { ProfileScreenNavigationProp } from './profile_types';
import PnLView from '@/components/Profile/PnLView';
import { formatPrice } from 'utils/numberFormat';

const Profile = () => {
	const navigation = useNavigation<ProfileScreenNavigationProp>();
	const { showToast } = useToast();
	const { wallet, tokens, fetchPortfolioBalance, isLoading: isPortfolioLoading, totalPortfolioValue, fetchPortfolioPnL } = usePortfolioStore();
	const styles = useStyles();
	const layout = useWindowDimensions();

	const tabs = [
		{ key: 'overview', title: 'Overview', icon: ProfileIcon },
		{ key: 'tokens', title: 'Tokens', icon: WalletIcon },
		{ key: 'transactions', title: 'Transactions', icon: SwapIcon },
		{ key: 'pnl', title: 'PnL', icon: ChartLineIcon },
	];

	const [index, setIndex] = useState(0);
	const [routes] = useState(tabs.map(tab => ({ key: tab.key, title: tab.title })));

	const sendButtonIcon = useCallback(() => (
		<SendIcon size={20} color={styles.colors.onPrimary} />
	), [styles.colors.onPrimary]);



	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed ProfileScreen' });
	}, []);

	const [isRefreshing, setIsRefreshing] = useState(false);

	const totalValue = totalPortfolioValue ?? 0;

	const sortedTokens = useMemo(() => {
		return sortTokensByValue(tokens);
	}, [tokens]);

	const handleRefresh = async () => {
		if (!wallet) return;
		logger.breadcrumb({ category: 'profile', message: 'Portfolio refresh initiated from ProfileScreen' });
		setIsRefreshing(true);
		try {
			// Only refresh portfolio balance for overview and tokens tabs
			// Transactions and PnL tabs handle their own refresh
			await fetchPortfolioBalance(wallet.address, true);
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
		<View style={styles.fixedHeader} accessible={false}>
			<View style={styles.profileHeader} accessible={false}>
				<View style={styles.profileIconContainer} accessible={false}>
					<ProfileIcon size={28} color={styles.colors.onSurface} />
					<Text style={styles.profileTitle} accessible={true} testID="portfolio-title">Portfolio</Text>
				</View>
				<Pressable
					onPress={() => {
						logger.breadcrumb({ category: 'navigation', message: 'Navigating to SettingsScreen from Profile' });
						navigation.navigate('Settings');
					}}
					style={styles.settingsButton}
					accessible={true}
					testID="settings-button"
				>
					<SettingsIcon
						size={24}
						color={styles.colors.onSurface}
					/>
				</Pressable>
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

	const OverviewTab = () => (
		<View style={styles.tabContainer}>
			<View style={styles.tabContentContainer}>
				<View style={styles.portfolioSection}>
					<Text style={styles.portfolioTitle} accessible={true}>Total Portfolio Value</Text>
					<Text style={styles.portfolioValue} accessible={true}>
						{formatPrice(totalValue, true)}
					</Text>
					<Text style={styles.portfolioSubtext} accessible={true}>
						{tokens.length} Token{tokens.length !== 1 ? 's' : ''}
					</Text>
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
						<Text style={styles.sendButtonText}>Send Tokens</Text>
					</Button>
				</View>
			</View>
		</View>
	);

	const TokensTab = () => (
		<View style={styles.tabContainer}>
			<View style={styles.tabContentContainer}>
				{sortedTokens.length === 0 ? (
					<View style={styles.emptyTokensContainer}>
						<View style={styles.tokensHeader} accessible={false}>
							<View style={styles.tokensIcon}>
								<CoinsIcon size={24} color={styles.colors.onSurface} />
							</View>
							<Text style={styles.tokensTitle} accessible={true} testID="your-tokens-title">Your Tokens</Text>
						</View>
						<View style={styles.emptyStateContainer} accessible={false}>
							<View style={styles.emptyStateIcon}>
								<WalletIcon size={48} color={styles.colors.onSurfaceVariant} />
							</View>
							<Text style={styles.emptyStateTitle} accessible={true}>No Tokens Found</Text>
							<Text style={styles.emptyStateText} accessible={true}>
								Your wallet doesn&apos;t contain any tokens yet. Start trading to build your portfolio!
							</Text>
						</View>
					</View>
				) : (
					<TokenListCard
						title=''
						coins={sortedTokens.map(token => createCoinCardProps(token))}
						showSparkline={false}
						showBalanceAndValue={true}
						noHorizontalMargin={true}
						noRoundedCorners={true}
						onCoinPress={(coin) => {
							logger.breadcrumb({
								category: 'ui',
								message: 'Pressed token card on ProfileScreen',
								data: { tokenSymbol: coin.symbol, tokenMint: coin.address }
							});
							handleTokenPress(coin, navigation.navigate);
						}}
						testIdPrefix="profile-token"
					/>
				)}
			</View>
		</View>
	);



	const renderScene = ({ route }: { route: { key: string } }) => {
		switch (route.key) {
			case 'overview':
				return <OverviewTab />;
			case 'tokens':
				return <TokensTab />;
			case 'transactions':
				return <TransactionsList />;
			case 'pnl':
				return <PnLView />;
			default:
				logger.warn(`Unknown route key: ${route.key}`);
				return null;
		}
	};

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
	const renderTabBar = props => {
		const { key, ...restProps } = props;
		return (
			<TabBar
				key={key}
				{...restProps}
				indicatorStyle={styles.tabIndicator}
				style={styles.tabBar}
				renderIcon={({ route, focused }) => {
					const tab = tabs.find(t => t.key === route.key);
					if (!tab) return null;
					const IconComponent = tab.icon;
					return (
						<IconComponent
							size={20}
							color={focused ? styles.colors.primary : styles.colors.onSurfaceVariant}
						/>
					);
				}}
				renderLabel={({ route, focused }) => {
					const tab = tabs.find(t => t.key === route.key);
					return (
						<Text style={[
							styles.tabLabel,
							focused ? styles.tabLabelActive : styles.tabLabelInactive
						]}>
							{tab ? tab.title : ''}
						</Text>
					);
				}}
				pressColor={styles.colors.primaryContainer}
				labelStyle={styles.tabLabel}
			/>
		);
	};

	return (
		<SafeAreaView style={styles.safeArea} accessible={false}>
			<View style={styles.container} accessible={false} testID="profile-screen">
				{renderHeader()}
				<View style={styles.tabViewContainer}>
					<TabView
						renderTabBar={renderTabBar}
						navigationState={{ index, routes }}
						renderScene={(sceneProps) => {
							// PnL and Transactions tabs handle their own refresh
							if (sceneProps.route.key === 'pnl' || sceneProps.route.key === 'transactions') {
								return renderScene(sceneProps);
							}
							// Overview and Tokens tabs use the portfolio refresh
							return (
								<ScrollView
									accessible={false}
									contentContainerStyle={styles.scrollContent}
									refreshControl={
										<RefreshControl
											refreshing={isRefreshing || isPortfolioLoading}
											onRefresh={handleRefresh}
											colors={styles.refreshControlColors}
											tintColor={styles.colors.primary}
										/>
									}
								>
									{renderScene(sceneProps)}
								</ScrollView>
							);
						}}
						onIndexChange={setIndex}
						initialLayout={{ width: layout.width }}
						swipeEnabled={true}
						style={styles.tabContent}
					/>
				</View>
			</View>
		</SafeAreaView>
	);
};

export default Profile;
