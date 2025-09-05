import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, SafeAreaView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '@components/Common/Toast';
import { handleTokenPress } from './profile_scripts';
import { usePortfolioStore } from '@store/portfolio';
import { useStyles } from './profile_styles';
import TokensList from '@/components/Profile/TokensList';
import ScreenHeader from '@/components/Common/ScreenHeader';
import { WalletIcon, SettingsIcon, SendIcon, ReceiveIcon } from '@components/Common/Icons';
import { logger } from '@/utils/logger';
import type { ProfileScreenNavigationProp } from './profile_types';

const Profile = () => {
	const navigation = useNavigation<ProfileScreenNavigationProp>();
	const { showToast } = useToast();
	const { wallet, tokens, fetchPortfolioBalance, isLoading: isPortfolioLoading, totalPortfolioValue } = usePortfolioStore();
	const styles = useStyles();



	useEffect(() => {
		logger.breadcrumb({ category: 'navigation', message: 'Viewed ProfileScreen' });
	}, []);

	const [isRefreshing, setIsRefreshing] = useState(false);

	const totalValue = totalPortfolioValue ?? 0;


	const handleRefresh = async () => {
		if (!wallet) return;
		logger.info('[Profile] Pull-to-refresh initiated for wallet:', wallet.address);
		logger.breadcrumb({ category: 'profile', message: 'Portfolio refresh initiated from ProfileScreen' });
		setIsRefreshing(true);
		try {
			// Only refresh portfolio balance for overview and tokens tabs
			// Transactions and PnL tabs handle their own refresh
			logger.info('[Profile] Calling fetchPortfolioBalance with forceRefresh=true');
			await fetchPortfolioBalance(wallet.address, true);
			logger.info('[Profile] Portfolio refresh completed');
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
		<ScreenHeader
			title="Portfolio"
			rightAction={{
				icon: <SettingsIcon size={24} color={styles.colors.onSurface} />,
				onPress: () => {
					logger.breadcrumb({ category: 'navigation', message: 'Navigating to SettingsScreen from Profile' });
					navigation.navigate('Settings');
				},
				testID: "settings-button"
			}}
			showRightAction={true}
		/>
	);

	const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onPress: () => void; disabled?: boolean }> = ({ icon, label, onPress, disabled = false }) => (
		<TouchableOpacity
			style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
			onPress={onPress}
			disabled={disabled}
		>
			<View style={styles.actionButtonIcon}>{icon}</View>
			<Text style={styles.actionButtonLabel}>{label}</Text>
		</TouchableOpacity>
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
				{renderHeader()}
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
					{/* Portfolio Value Section */}
					<View style={styles.portfolioValueContainer}>
						<Text style={styles.portfolioValue} testID="portfolio-total-value">
							${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
						</Text>
					</View>

					{/* Action Buttons */}
					<View style={styles.actionButtonsContainer}>
						<ActionButton
							icon={<ReceiveIcon size={24} color={styles.colors.primary} />}
							label="Receive"
							onPress={() => {
								showToast({ message: 'Receive functionality coming soon', type: 'info' });
							}}
						/>
						<ActionButton
							icon={<SendIcon size={24} color={styles.colors.primary} />}
							label="Send"
							onPress={() => {
								logger.breadcrumb({ category: 'navigation', message: 'Navigating to SendTokensScreen from Profile' });
								navigation.navigate('SendTokens');
							}}
							disabled={tokens.length === 0}
						/>
					</View>

					{/* Tokens Label */}
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Tokens</Text>
					</View>

					{/* Tokens List */}
					<View style={styles.tokensWrapper}>
						<TokensList
							tokens={tokens}
							onTokenPress={(coin) => {
								logger.breadcrumb({
									category: 'ui',
									message: 'Pressed token card on ProfileScreen',
									data: { tokenSymbol: coin.symbol, tokenMint: coin.address }
								});
								handleTokenPress(coin, navigation.navigate);
							}}
						/>
					</View>
				</ScrollView>
			</View>
		</SafeAreaView>
	);
};

export default Profile;
