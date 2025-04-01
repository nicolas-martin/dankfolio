import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Box, Text, ScrollView, Icon, HStack, VStack, Image } from '@gluestack-ui/themed';
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

  if (!wallet || !walletBalance) {
    return (
      <Box flex={1} bg="$background" justifyContent="center" alignItems="center">
        <Icon as={ICON_WALLET} size={48} color="$textSecondary" mb="$4" />
        <Text color="$text" fontSize="$lg">No wallet data available</Text>
      </Box>
    );
  }

  const TokenCard = ({ token, balance, onPress }: {
    token: TokenInfo,
    balance: number,
    onPress: () => void
  }) => (
    <TouchableOpacity onPress={onPress}>
      <Box
        bg="$backgroundDark"
        p="$4"
        rounded="$lg"
        mb="$3"
      >
        <HStack space="md" alignItems="center">
          {token.icon_url ? (
            <Box 
              width={40}
              height={40}
              rounded="$full"
              overflow="hidden"
              bg="$background"
            >
              <Image 
                source={{ uri: token.icon_url }}
                alt={`${token.symbol} icon`}
                width={40}
                height={40}
                objectFit="contain"
              />
            </Box>
          ) : (
            <Box 
              width={40}
              height={40}
              rounded="$full"
              bg="$background"
              justifyContent="center"
              alignItems="center"
            >
              <Icon as={ICON_COINS} size={24} color="$textSecondary" />
            </Box>
          )}
          
          <VStack flex={1}>
            <Text color="$text" fontSize="$lg" fontWeight="$bold">{token.symbol}</Text>
            <TouchableOpacity
              onPress={() => copyToClipboard(token.id || '', token.symbol, showToast)}
            >
              <HStack space="xs" alignItems="center">
                <Text color="$textSecondary" fontSize="$sm">{formatAddress(token.id)}</Text>
                <Icon as={ICON_LINK} size={16} color="$textSecondary" />
              </HStack>
            </TouchableOpacity>
          </VStack>

          <VStack alignItems="flex-end">
            <Text color="$text" fontSize="$base" fontWeight="$bold">
              {balance.toFixed(4)}
            </Text>
            <Text color="$textSecondary" fontSize="$sm">
              ${(balance * (token.price || 0)).toFixed(2)}
            </Text>
          </VStack>
        </HStack>
      </Box>
    </TouchableOpacity>
  );

  const totalValue = calculateTotalValue(walletBalance, solCoin);

  return (
    <Box flex={1} bg="$background">
      <ScrollView>
        <Box p="$4">
          <HStack space="md" alignItems="center" mb="$4">
            <Icon as={ICON_PROFILE} size={32} color="$text" />
            <VStack>
              <Text fontSize="$2xl" fontWeight="$bold" color="$text">Profile</Text>
              <TouchableOpacity
                onPress={() => copyToClipboard(wallet.address, 'Wallet', showToast)}
              >
                <HStack space="xs" alignItems="center">
                  <Text color="$textSecondary" fontSize="$base">
                    {formatAddress(wallet.address)}
                  </Text>
                  <Icon as={ICON_LINK} size={16} color="$textSecondary" />
                </HStack>
              </TouchableOpacity>
            </VStack>
          </HStack>

          <Box bg="$backgroundDark" p="$4" rounded="$lg" mb="$4">
            <Text fontSize="$xl" fontWeight="$bold" color="$text" mb="$4">Portfolio Value</Text>
            <Text fontSize="$3xl" fontWeight="$bold" color="$text">
              ${totalValue.totalValue.toFixed(2)}
            </Text>

            <HStack mt="$4" space="xl" justifyContent="space-between">
              <VStack flex={1}>
                <Text color="$textSecondary" fontSize="$base">SOL Balance</Text>
                <Text color="$text" fontSize="$lg" fontWeight="$bold">
                  {walletBalance.sol_balance.toFixed(4)} SOL
                </Text>
                <Text color="$textSecondary" fontSize="$base">
                  ${totalValue.solValue.toFixed(2)}
                </Text>
              </VStack>
              <VStack flex={1} alignItems="flex-end">
                <Text color="$textSecondary" fontSize="$base">Token Value</Text>
                <Text color="$text" fontSize="$lg" fontWeight="$bold">
                  {walletBalance.tokens.length} Tokens
                </Text>
                <Text color="$textSecondary" fontSize="$base">
                  ${totalValue.tokenValue.toFixed(2)}
                </Text>
              </VStack>
            </HStack>
          </Box>

          <Box bg="$backgroundDark" p="$4" rounded="$lg" mb="$4">
            <Text fontSize="$xl" fontWeight="$bold" color="$text" mb="$4">
              Distribution
            </Text>
            <WalletDonut 
              tokens={walletBalance.tokens}
              totalBalance={totalValue.totalValue}
            />
          </Box>

          <Box>
            <HStack alignItems="center" mb="$4">
              <Icon as={ICON_COINS} size={24} color="$text" mr="$2" />
              <Text fontSize="$xl" fontWeight="$bold" color="$text">
                Your Tokens
              </Text>
            </HStack>

            {walletBalance.tokens.map((token) => (
              <TokenCard
                key={token.id}
                token={token}
                balance={token.balance}
                onPress={() => handleTokenPress(token, solCoin, navigation.navigate)}
              />
            ))}
          </Box>
        </Box>
      </ScrollView>
    </Box>
  );
};

export default Profile;
