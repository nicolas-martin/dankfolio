import React from 'react';
import { TouchableOpacity, ScrollView, View, Image, StyleSheet } from 'react-native';
import { Text, Icon, useTheme, MD3Theme } from 'react-native-paper'; // Assuming Icon is from paper
import { TokenInfo } from '../../services/api';
import { useNavigation } from '@react-navigation/native';
import { Coin } from '../../types/index';
import { useToast } from '../../components/Common/Toast';
import { handleTokenPress, calculateTotalValue, copyToClipboard, formatAddress } from './profile_scripts';
import { CoinDetailScreenNavigationProp } from '../CoinDetail/coindetail_types';
import { usePortfolioStore } from '../../store/portfolio';
import WalletDonut from '../../components/WalletDonut';
import {
  ICON_PROFILE,
  ICON_WALLET,
  ICON_COINS,
  ICON_LINK,
} from '../../utils/icons';

const Profile = () => {
  const navigation = useNavigation<CoinDetailScreenNavigationProp>();
  const { showToast } = useToast();
  const { wallet, walletBalance, solCoin } = usePortfolioStore();
  const theme = useTheme();
  const styles = createStyles(theme);

  if (!wallet || !walletBalance) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Icon source={ICON_WALLET} size={48} color={theme.colors.onSurfaceVariant} />
        <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginTop: 16 }}>No wallet data available</Text>
      </View>
    );
  }

  const TokenCard = ({ token, balance, onPress }: {
    token: TokenInfo,
    balance: number,
    onPress: () => void
  }) => (
    <TouchableOpacity onPress={onPress}>
      <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
        <View style={styles.tokenCardRow}>
          {token.icon_url ? (
            <View style={[styles.tokenIconContainer, { backgroundColor: theme.colors.background }]}>
              <Image 
                source={{ uri: token.icon_url }}
                alt={`${token.symbol} icon`}
                style={styles.tokenImage}
                resizeMode="contain"
              />
            </View>
          ) : (
            <View style={[styles.tokenIconContainer, styles.centered, { backgroundColor: theme.colors.background }]}>
              <Icon source={ICON_COINS} size={24} color={theme.colors.onSurfaceVariant} />
            </View>
          )}
          
          <View style={styles.tokenInfoMiddle}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{token.symbol}</Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(token.id || '', token.symbol, showToast)}
            >
              <View style={styles.addressRow}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{formatAddress(token.id)}</Text>
                <Icon source={ICON_LINK} size={16} color={theme.colors.onSurfaceVariant} />
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.tokenBalance}>
            <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
              {balance.toFixed(4)}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              ${(balance * (token.price || 0)).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const totalValue = calculateTotalValue(walletBalance, solCoin);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.contentPadding}>
          <View style={styles.profileHeaderRow}>
            <Icon source={ICON_PROFILE} size={32} color={theme.colors.onSurface} />
            <View style={styles.profileHeaderTextContainer}>
              <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>Profile</Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(wallet.address, 'Wallet', showToast)}
              >
                <View style={styles.addressRow}>
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {formatAddress(wallet.address)}
                  </Text>
                  <Icon source={ICON_LINK} size={16} color={theme.colors.onSurfaceVariant} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.card, styles.portfolioValueCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>Portfolio Value</Text>
            <Text variant="displaySmall" style={{ color: theme.colors.onSurface }}>
              ${totalValue.totalValue.toFixed(2)}
            </Text>

            <View style={styles.balanceDetailsRow}>
              <View style={styles.balanceDetailItem}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>SOL Balance</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                  {walletBalance.sol_balance.toFixed(4)} SOL
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  ${totalValue.solValue.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.balanceDetailItem, styles.balanceDetailItemEnd]}>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>Token Value</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.onSurface, fontWeight: 'bold' }}>
                  {walletBalance.tokens.length} Tokens
                </Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  ${totalValue.tokenValue.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="titleLarge" style={[styles.cardTitle, { color: theme.colors.onSurface }]}>
              Distribution
            </Text>
            <WalletDonut 
              tokens={walletBalance.tokens}
              totalBalance={totalValue.totalValue}
            />
          </View>

          <View>
            <View style={styles.yourTokensHeader}>
              <Icon source={ICON_COINS} size={24} color={theme.colors.onSurface} />
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginLeft: 8 }}>
                Your Tokens
              </Text>
            </View>

            {walletBalance.tokens.map((token) => (
              <TokenCard
                key={token.id}
                token={token}
                balance={token.balance}
                onPress={() => handleTokenPress(token, solCoin, navigation.navigate)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;

// Helper function to create styles with theme access
const createStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentPadding: {
    padding: 16, // $4
  },
  card: {
    padding: 16, // $4
    borderRadius: 8, // $lg
    marginBottom: 12, // $3
  },
  portfolioValueCard: {
    marginBottom: 16, // $4
  },
  cardTitle: {
    marginBottom: 16, // $4
    fontWeight: 'bold',
  },
  tokenCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // space="md" approximation
  },
  tokenIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20, // $full approximation
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenImage: {
    width: 40,
    height: 40,
  },
  tokenInfoMiddle: {
    flex: 1,
    gap: 4, // Approximation for VStack default spacing?
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // space="xs"
  },
  tokenBalance: {
    alignItems: 'flex-end',
    gap: 4, // Approximation for VStack default spacing?
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16, // $4
    gap: 12, // space="md" approximation
  },
  profileHeaderTextContainer: {
    gap: 4, // Approximation for VStack default spacing?
  },
  balanceDetailsRow: {
    marginTop: 16, // $4
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16, // space="xl" approximation
  },
  balanceDetailItem: {
    flex: 1,
    gap: 4, // Approximation for VStack default spacing?
  },
  balanceDetailItemEnd: {
    alignItems: 'flex-end',
  },
  yourTokensHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16, // $4
  },
});
