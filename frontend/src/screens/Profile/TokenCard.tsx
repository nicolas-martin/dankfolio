import React from 'react';
import { TouchableOpacity, View, Image } from 'react-native';
import { Text, Icon, useTheme, IconButton } from 'react-native-paper';
import { TokenInfo } from '../../services/api';
import { ICON_COINS } from '../../utils/icons';
import { createStyles } from './profile_styles';
import { copyToClipboard, formatAddress } from './profile_scripts';
import { useToast } from '../../components/Common/Toast';

interface TokenCardProps {
  token: TokenInfo;
  balance: number;
  onPress: () => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({ token, balance, onPress }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  const { showToast } = useToast();

  return (
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
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              {token.symbol}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {formatAddress(token.id)}
              </Text>
              <IconButton
                icon="content-copy"
                size={16}
                onPress={() => copyToClipboard(token.id, token.symbol, showToast)}
                style={{ margin: 0, padding: 0, marginLeft: 4 }}
              />
            </View>
          </View>

          <View style={styles.tokenBalance}>
            <Text variant="bodyLarge" style={styles.tokenBalanceText}>
              {balance.toFixed(4)}
            </Text>
            <Text variant="bodySmall" style={styles.tokenValueText}>
              ${(balance * (token.price || 0)).toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};