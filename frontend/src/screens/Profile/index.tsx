import React, { useMemo, useState, useEffect } from 'react'; // Ensure React is imported for JSX
import { View, ScrollView, RefreshControl, SafeAreaView, ActivityIndicator } from 'react-native';
import { Text, useTheme, IconButton, Button, Icon, List, MD3Theme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { handleTokenPress, copyToClipboard, formatAddress, sortTokensByValue } from './profile_scripts';
import { CoinDetailScreenNavigationProp } from '@screens/CoinDetail/coindetail_types';
import { usePortfolioStore } from '@store/portfolio';
import { useTransactionsStore } from '@/store/transactions';
import { Transaction } from '@/types';
import { createStyles } from './profile_styles';
import CoinCard from '@/components/Home/CoinCard';
import * as Sentry from '@sentry/react-native';
import {
	ProfileIcon,
	WalletIcon,
	CoinsIcon,
	SendIcon,
	SwapIcon,
} from '@components/Common/Icons';
import { logger } from '@/utils/logger';

const Profile = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const { showToast } = useToast();
	const { wallet, tokens, fetchPortfolioBalance, isLoading: isPortfolioLoading } = usePortfolioStore();
	const {
		transactions,
		isLoading: isTransactionsLoading,
		error: transactionsError,
		fetchRecentTransactions,
		hasFetched: transactionsHasFetched
	} = useTransactionsStore();
	const theme = useTheme();
	const styles = createStyles(theme);

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

	const renderTransactionsSection = () => {
		if (!transactionsHasFetched && !isTransactionsLoading) {
			return null;
		}

		const getStatusStyle = (status: Transaction['status']) => {
			switch (status.toUpperCase()) {
				case 'PENDING':
					return styles.transactionStatusTextPending;
				case 'COMPLETED':
					return styles.transactionStatusTextCompleted;
				case 'FAILED':
					return styles.transactionStatusTextFailed;
				default:
					return { color: theme.colors.onSurfaceVariant, marginLeft: 4, fontSize: 13, fontWeight: 'bold' as const }; // Default style
			}
		};

		return (
			<View style={styles.transactionsSection}>
				<View style={styles.transactionsHeader}>
					<Icon source="history" size={24} color={theme.colors.onSurface} />
					<Text style={styles.transactionsTitle}>Recent Transactions</Text>
				</View>

				{isTransactionsLoading && !transactions.length ? (
					<ActivityIndicator animating={true} color={theme.colors.primary} style={styles.loadingIndicator} size="large" />
				) : transactionsError ? (
					<View style={styles.transactionEmptyStateContainer}> {/* Use specific empty state style */}
						<Icon source="alert-circle-outline" size={48} color={theme.colors.error} />
						<Text style={styles.emptyStateTitle}>Error Loading Transactions</Text>
						<Text style={styles.emptyStateText}>{transactionsError}</Text>
					</View>
				) : transactions.length === 0 && transactionsHasFetched ? (
					<View style={styles.transactionEmptyStateContainer}> {/* Use specific empty state style */}
						<Icon source="format-list-bulleted" size={48} color={theme.colors.onSurfaceVariant} />
						<Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
						<Text style={styles.emptyStateText}>Your transaction history will appear here once you start trading or transferring tokens.</Text>
					</View>
				) : (
					<View style={styles.transactionsListContainer}>
						{transactions.slice(0, 5).map((tx) => (
							<List.Item
								key={tx.id}
								title={
									<Text style={styles.transactionTitleText}>
										{tx.type === 'SWAP'
											? `Swap ${tx.fromCoinSymbol} for ${tx.toCoinSymbol}`
											: `Transfer ${tx.amount > 0 ? tx.fromCoinSymbol : tx.toCoinSymbol}`}
									</Text>
								}
								description={(props) => ( // Use function for description to allow complex content
									<Text {...props} style={styles.transactionSubtitleText}>
										<Text>{formatDate(tx.date)}</Text>
										<Text> - </Text>
										<Text style={getStatusStyle(tx.status)}>{tx.status.toUpperCase()}</Text>
									</Text>
								)}
								left={() => (
									<View style={styles.transactionIconContainer}>
										<TransactionTypeIcon type={tx.type} theme={theme} />
									</View>
								)}
								// right prop can be used for amount or other details if needed
								// right={() => (
								// 	<Text style={{ alignSelf: 'center', color: theme.colors.primary }}>
								// 		{/* {tx.amount.toFixed(2)} {tx.type === 'SWAP' ? tx.fromCoinSymbol : ''} */}
								// 	</Text>
								// )}
								style={styles.transactionItem}
								onPress={() => {
									logger.info('Transaction item pressed', { txId: tx.id, hash: tx.transactionHash });
									// TODO: Navigate to transaction detail screen if available
								}}
							/>
						))}
						{transactions.length > 5 && (
							<Button
								mode="text"
								onPress={() => { /* TODO: Navigate to full transaction history screen */ }}
								style={styles.viewAllButton} // Apply style to View All button
								labelStyle={{ color: theme.colors.primary }} // Ensure text color matches theme
							>
								View All Transactions
							</Button>
						)}
					</View>
				)}
			</View>
		);
	};

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
						refreshing={isRefreshing || isPortfolioLoading || isTransactionsLoading}
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
						{renderTransactionsSection()}
					</View>

					{/* Debug button - temporary */}
					{/* <Button
						onPress={() => { Sentry.captureException(new Error('First error')) }}
						style={styles.debugButton}
					>
						Send test sentry error
					</Button> */}
				</ScrollView>
			</View>
		</SafeAreaView>
	);
};

// Helper function to format date (can be moved to a utility file later)
const formatDate = (dateString: string) => {
	if (!dateString) return 'N/A';
	try {
		return new Date(dateString).toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	} catch (e) {
		return dateString; // fallback to original string if parsing fails
	}
};

const TransactionTypeIcon = ({ type, theme }: { type: Transaction['type'], theme: any }) => {
	const iconColor = theme.colors.onSurfaceVariant;
	switch (type) {
		case 'SWAP':
			return <SwapIcon size={20} color={iconColor} />;
		case 'TRANSFER':
			// Could differentiate between send/receive if data available
			return <Icon source="arrow-up" size={20} color={iconColor} />;
		default:
			return <Icon source="help-circle-outline" size={20} color={iconColor} />;
	}
};

export default Profile;
