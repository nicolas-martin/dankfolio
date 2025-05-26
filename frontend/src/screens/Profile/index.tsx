import { useMemo, useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, SafeAreaView } from 'react-native';
import { Text, useTheme, IconButton, Button, Icon } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { handleTokenPress, copyToClipboard, formatAddress, sortTokensByValue } from './profile_scripts';
import { CoinDetailScreenNavigationProp } from '@screens/CoinDetail/coindetail_types';
import { usePortfolioStore } from '@store/portfolio';
import { createStyles } from './profile_styles';
import CoinCard from '@/components/Home/CoinCard';
import * as Sentry from '@sentry/react-native';
import {
	ProfileIcon,
	WalletIcon,
	CoinsIcon,
	SendIcon
} from '@components/Common/Icons';
import { logger } from '@/utils/logger';

const Profile = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const { showToast } = useToast();
	const { wallet, tokens, fetchPortfolioBalance, isLoading } = usePortfolioStore();
	const theme = useTheme();
	const styles = createStyles(theme);

	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed ProfileScreen' });
	}, []);

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
		} catch (error) {
			showToast({
				message: 'Error refreshing portfolio',
				type: 'error'
			});
		} finally {
			setIsRefreshing(false);
		}
	};

	const renderHeader = () => (
		<View style={styles.headerSection}>
			<View style={styles.profileHeader}>
				<View style={styles.profileIcon}>
					<ProfileIcon size={28} color={theme.colors.onSurface} />
				</View>
				<Text style={styles.profileTitle}>Portfolio</Text>
			</View>
			{wallet && (
				<View style={styles.walletAddressContainer}>
					<Text style={styles.walletAddress}>
						{formatAddress(wallet.address)}
					</Text>
					<IconButton
						icon="content-copy"
						size={16}
						onPress={() => {
							logger.breadcrumb({ category: 'ui', message: 'Copied wallet address to clipboard from ProfileScreen' });
							copyToClipboard(wallet.address, 'Wallet', showToast);
						}}
						style={styles.copyButton}
					/>
				</View>
			)}
		</View>
	);

	const renderPortfolioCard = () => (
		<View style={styles.portfolioCard}>
			<View style={styles.portfolioHeader}>
				<Text style={styles.portfolioTitle}>Total Portfolio Value</Text>
				<Text style={styles.portfolioValue}>
					${totalValue.toFixed(2)}
				</Text>
				<Text style={styles.portfolioSubtext}>
					{tokens.length} Token{tokens.length !== 1 ? 's' : ''}
				</Text>
			</View>
			<Button
				mode="contained"
				icon={() => <SendIcon size={20} color={theme.colors.onPrimary} />}
				onPress={() => {
					logger.breadcrumb({ category: 'navigation', message: 'Navigating to SendTokensScreen from Profile' });
					navigation.navigate('SendTokens');
				}}
				style={styles.sendButton}
				contentStyle={styles.sendButtonContent}
			>
				Send Tokens
			</Button>
		</View>
	);

	const renderTokensSection = () => (
		<View style={styles.tokensSection}>
			<View style={styles.tokensHeader}>
				<View style={styles.tokensIcon}>
					<CoinsIcon size={24} color={theme.colors.onSurface} />
				</View>
				<Text style={styles.tokensTitle}>Your Tokens</Text>
			</View>

			{sortedTokens.length === 0 ? (
				<View style={styles.emptyStateContainer}>
					<View style={styles.emptyStateIcon}>
						<Icon source="wallet-outline" size={48} color={theme.colors.onSurfaceVariant} />
					</View>
					<Text style={styles.emptyStateTitle}>No Tokens Found</Text>
					<Text style={styles.emptyStateText}>
						Your wallet doesn't contain any tokens yet. Start trading to build your portfolio!
					</Text>
				</View>
			) : (
				sortedTokens.map((token) => (
					<CoinCard
						key={token.mintAddress}
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
					<WalletIcon size={48} color={theme.colors.primary} />
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
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
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
						{renderHeader()}
						{renderPortfolioCard()}
						{renderTokensSection()}
					</View>
					
					{/* Debug button - temporary */}
					<Button 
						onPress={() => { Sentry.captureException(new Error('First error')) }}
						style={styles.debugButton}
					>
						Send test sentry error
					</Button>
				</ScrollView>
			</View>
		</SafeAreaView>
	);
};

export default Profile;
