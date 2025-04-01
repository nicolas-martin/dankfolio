import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Icon, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../../components/Common/Toast';
import { handleTokenPress, calculateTotalValue, copyToClipboard, formatAddress } from './profile_scripts';
import { CoinDetailScreenNavigationProp } from '../CoinDetail/coindetail_types';
import { usePortfolioStore } from '../../store/portfolio';
import { createStyles } from './profile_styles';
import { TokenCard } from './TokenCard';
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
        <Text 
          variant="titleLarge"
          style={{ color: theme.colors.onSurface, marginTop: 16 }}
        >
          No wallet data available
        </Text>
      </View>
    );
  }

  const totalValue = calculateTotalValue(walletBalance, solCoin);

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
              <TouchableOpacity
                onPress={() => copyToClipboard(wallet.address, 'Wallet', showToast)}
              >
                <View style={styles.addressRow}>
                  <Text
                    variant="bodyMedium"
                    style={styles.addressText}
                  >
                    {formatAddress(wallet.address)}
                  </Text>
                  <Icon source={ICON_LINK} size={16} color={theme.colors.onSurfaceVariant} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.card, styles.portfolioValueCard, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text
              variant="titleLarge"
              style={[styles.cardTitle, { color: theme.colors.onSurface }]}
            >
              Portfolio Value
            </Text>
            <Text variant="displaySmall" style={{ color: theme.colors.onSurface }}>
              ${totalValue.totalValue.toFixed(2)}
            </Text>

            <View style={styles.balanceDetailsRow}>
              <View style={styles.balanceDetailItem}>
                <Text variant="bodyMedium" style={styles.tokenValueText}>
                  SOL Balance
                </Text>
                <Text
                  variant="titleMedium"
                  style={styles.tokenBalanceText}
                >
                  {walletBalance.sol_balance.toFixed(4)} SOL
                </Text>
                <Text variant="bodyMedium" style={styles.tokenValueText}>
                  ${totalValue.solValue.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.balanceDetailItem, styles.balanceDetailItemEnd]}>
                <Text variant="bodyMedium" style={styles.tokenValueText}>
                  Token Value
                </Text>
                <Text
                  variant="titleMedium"
                  style={styles.tokenBalanceText}
                >
                  {walletBalance.tokens.length} Tokens
                </Text>
                <Text variant="bodyMedium" style={styles.tokenValueText}>
                  ${totalValue.tokenValue.toFixed(2)}
                </Text>
              </View>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text
              variant="titleLarge"
              style={[styles.cardTitle, { color: theme.colors.onSurface }]}
            >
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
              <Text
                variant="titleLarge"
                style={[styles.tokenHeaderText, { color: theme.colors.onSurface }]}
              >
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