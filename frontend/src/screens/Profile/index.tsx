import React, { useMemo } from 'react';
import { View, ScrollView } from 'react-native';
import { Text, Icon, useTheme, IconButton } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../../components/Common/Toast';
import { handleTokenPress, copyToClipboard, formatAddress, sortTokensByValue } from './profile_scripts';
import { CoinDetailScreenNavigationProp } from '../CoinDetail/coindetail_types';
import { usePortfolioStore } from '../../store/portfolio';
import { createStyles } from './profile_styles';
import { TokenCard } from './TokenCard';
import {
	ICON_PROFILE,
	ICON_WALLET,
	ICON_COINS,
} from '../../utils/icons';

const Profile = () => {
	const navigation = useNavigation<CoinDetailScreenNavigationProp>();
	const { showToast } = useToast();
	const { wallet, tokens } = usePortfolioStore();
	const theme = useTheme();
	const styles = createStyles(theme);

	const totalValue = useMemo(() => {
		return tokens.reduce((sum, token) => sum + token.value, 0);
	}, [tokens]);

	const sortedTokens = useMemo(() => {
		return sortTokensByValue(tokens);
	}, [tokens]);

	if (!wallet || tokens.length === 0) {
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
							${totalValue.toFixed(2)}
						</Text>
						<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 8 }}>
							{tokens.length} Token{tokens.length !== 1 ? 's' : ''}
						</Text>
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
	);
};

export default Profile;
