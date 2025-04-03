import React from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Icon, useTheme, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../../components/Common/Toast';
import { handleTokenPress, calculateTotalValue, copyToClipboard, formatAddress } from './profile_scripts';
import { CoinDetailScreenNavigationProp } from '../CoinDetail/coindetail_types';
import { usePortfolioStore } from '../../store/portfolio';
import { useCoinStore } from '../../store/coins';
import { createStyles } from './profile_styles';
import { TokenCard } from './TokenCard';
import WalletDonut from '../../components/WalletDonut';
import {
	ICON_PROFILE,
	ICON_WALLET,
	ICON_COINS,
} from '../../utils/icons';

const Profile = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const { showToast } = useToast();
	const { wallet, porfolio: portfolio } = usePortfolioStore();
	const { getCoinByID } = useCoinStore();
	const theme = useTheme();
	const styles = createStyles(theme);

	if (!wallet || !portfolio) {
		return (
			<View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
				<Icon source={ICON_WALLET} size={48} color={theme.colors.onSurfaceVariant} />
				<Text
					variant="titleLarge"
					style={{ color: theme.colors.onSurface, marginTop: 16 }}
				>
					No wallet data available
				</Text>
			</View>
		);
	}

	const totalValue = calculateTotalValue(portfolio);

	return (
		<View style={[styles.container, { backgroundColor: theme.colors.background }]}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				<View style={styles.contentPadding}>
					<View style={styles.profileHeaderRow}>
						<Icon source={ICON_PROFILE} size={32} color={theme.colors.onSurface} />
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
					${totalValue.totalValue.toFixed(2)}
					</Text>
					<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
					{portfolio.tokens.length} Token{portfolio.tokens.length !== 1 ? 's' : ''}
					</Text>
					</View>
					
					<View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
					<Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
					Distribution
					</Text>
					<WalletDonut tokens={portfolio.tokens} totalBalance={totalValue.totalValue} />
					</View>

					<View>
						<View style={styles.yourTokensHeader}>
							<Icon source={ICON_COINS} size={24} color={theme.colors.onSurface} />
							<Text
								variant="titleLarge"
								style={[styles.tokenHeaderText, { color: theme.colors.onSurface }]}
							>
								Your Tokens
							</Text>
						</View>

						{portfolio.tokens.map((token) => (
							<TokenCard
								key={token.id}
								token={token}
								balance={token.balance}
								onPress={() => handleTokenPress(token, navigation.navigate)}
							/>
						))}
					</View>
				</View>
			</ScrollView>
		</View>
	);
};

export default Profile;
