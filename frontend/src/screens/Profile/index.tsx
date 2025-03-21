import React from 'react';
import { View, Text, SafeAreaView, ScrollView, Image, TouchableOpacity } from 'react-native';
import { TokenInfo } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import TopBar from '../../components/common/ui/TopBar';
import { Coin } from '../../types/index';
import { useToast } from '../../components/common/Toast';
import { handleTokenPress, calculateTotalValue, copyToClipboard, formatAddress } from './scripts';
import { styles } from './styles'
import { CoinDetailScreenNavigationProp } from '../CoinDetail/types';
import { ProfileScreenNavigationProp } from './types';


const Profile: React.FC<ProfileScreenNavigationProp> = ({ route }) => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const { showToast } = useToast();
	const { walletBalance, walletAddress, solCoin } = route.params;

	const TokenCard = ({ token, balance, onPress }: {
		token: Coin | TokenInfo,
		balance: number,
		onPress: () => void
	}) => (
		<TouchableOpacity
			style={styles.tokenCard}
			onPress={onPress}
			activeOpacity={0.7}
		>
			<View style={styles.tokenHeader}>
				<View style={styles.tokenHeaderLeft}>
					{token.icon_url && (
						<Image
							source={{ uri: token.icon_url }}
							style={styles.tokenLogo}
						/>
					)}
					<View style={styles.tokenInfo}>
						<Text style={styles.tokenSymbol}>{token.symbol}</Text>
						<TouchableOpacity
							style={styles.addressContainer}
							onPress={() => copyToClipboard(token.id || '', token.symbol, showToast)}
						>
							<Text style={styles.addressText}>{formatAddress(token.id)}</Text>
							<Text style={styles.copyIcon}>📋</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
			<View style={styles.tokenDetails}>
				<View style={styles.tokenDetail}>
					<Text style={styles.detailLabel}>Balance</Text>
					<Text style={styles.detailValue} numberOfLines={1} adjustsFontSizeToFit>
						{balance.toFixed(4)}
					</Text>
				</View>
				<View style={styles.tokenDetail}>
					<Text style={styles.detailLabel}>Value</Text>
					<Text style={styles.detailValue}>
						${(balance * (token.price || 0)).toFixed(2)}
					</Text>
				</View>
				<View style={styles.tokenDetail}>
					<Text style={styles.detailLabel}>Price</Text>
					<Text style={styles.detailValue}>
						${token.price?.toFixed(4) || '0.0000'}
					</Text>
				</View>
			</View>
		</TouchableOpacity>
	);

	return (
		<SafeAreaView style={styles.container}>
			<TopBar />
			<ScrollView style={styles.scrollView}>
				<View style={styles.header}>
					<Text style={styles.title}>🎭 Profile</Text>
					<Text style={styles.subtitle}>Your Portfolio</Text>
					<TouchableOpacity
						onPress={() => copyToClipboard(walletAddress, 'Wallet', showToast)}
						style={styles.addressContainer}
					>
						<Text style={styles.walletAddressText}>Address: {formatAddress(walletAddress)}</Text>
						<Text style={styles.copyIcon}>📋</Text>
					</TouchableOpacity>
				</View>

				<View style={styles.portfolioCard}>
					<Text style={styles.portfolioTitle}>Total Value</Text>
					<Text style={styles.portfolioValue}>${calculateTotalValue(walletBalance, solCoin).totalValue.toFixed(2)}</Text>

					{/* Portfolio Breakdown */}
					<View style={styles.portfolioBreakdown}>
						<View style={styles.breakdownItem}>
							<Text style={styles.breakdownLabel}>SOL Balance</Text>
							<Text style={styles.breakdownValue}>{walletBalance.sol_balance.toFixed(4)} SOL</Text>
							<Text style={styles.breakdownUsd}>${calculateTotalValue(walletBalance, solCoin).solValue.toFixed(2)}</Text>
						</View>
						<View style={styles.breakdownDivider} />
						<View style={styles.breakdownItem}>
							<Text style={styles.breakdownLabel}>Token Value</Text>
							<Text style={styles.breakdownValue}>{walletBalance.tokens.length} Tokens</Text>
							<Text style={styles.breakdownUsd}>${calculateTotalValue(walletBalance, solCoin).tokenValue.toFixed(2)}</Text>
						</View>
					</View>
				</View>

				<View style={styles.tokensContainer}>
					<Text style={styles.sectionTitle}>Your Assets</Text>

					{/* SOL Balance Card */}
					{solCoin && (
						<TokenCard
							token={solCoin}
							balance={walletBalance.sol_balance}
							onPress={() => handleTokenPress(solCoin, solCoin, walletBalance, navigation.navigate)}
						/>
					)}

					{/* Token List */}
					{walletBalance.tokens.length === 0 ? (
						<View style={styles.emptyStateContainer}>
							<Text style={styles.emptyStateText}>No token assets found in wallet 🔍</Text>
						</View>
					) : (
						walletBalance.tokens.map((token) => (
							<TokenCard
								key={token.symbol}
								token={token}
								balance={token.balance}
								onPress={() => handleTokenPress(token, solCoin, walletBalance, navigation.navigate)}
							/>
						))
					)}
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

export default Profile;
