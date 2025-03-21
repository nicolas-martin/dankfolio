import React from 'react';
import { View, Text, Image, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Coin } from '../../../types/index';
import { theme } from '../../../utils/theme';
import { CoinSelectorProps } from './types';
import { styles } from './styles'

const DEFAULT_ICON = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

const getCoinIcon = (coinObj?: Coin): string => {
  if (!coinObj) return DEFAULT_ICON;
  return coinObj.icon_url || DEFAULT_ICON;
};

const CoinSelector: React.FC<CoinSelectorProps> = ({
  label,
  selectedCoin,
  amount,
  isAmountLoading,
  onAmountChange,
  onCoinSelect,
  isInput = false,
  inputRef,
}) => {
  const renderCoinItem = () => {
    if (!selectedCoin) return <Text style={styles.placeholderText}>Select coin</Text>;

    return (
      <View style={styles.coinContainer}>
        <View style={styles.leftSection}>
          <Image
            source={{ uri: getCoinIcon(selectedCoin) }}
            style={styles.coinIcon}
            defaultSource={{ uri: DEFAULT_ICON }}
          />
          <View style={styles.coinInfo}>
            <Text style={styles.coinSymbol}>{selectedCoin.symbol}</Text>
            <Text style={styles.coinName}>{selectedCoin.name}</Text>
          </View>
        </View>
        <View style={styles.balanceSection}>
          <Text style={styles.balanceText}>
            {selectedCoin.balance?.toFixed(9) || '0.000000000'}
          </Text>
          <Text style={styles.valueText}>
            ${(selectedCoin.price * (selectedCoin.balance || 0)).toFixed(4)}
          </Text>
        </View>
      </View>
    );
  };

  const renderAmount = () => {
    if (isInput) {
      return (
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={onAmountChange}
          placeholder="0.00"
          placeholderTextColor={theme.colors.textSecondary}
          selectionColor={theme.colors.primary}
          ref={inputRef}
          autoCorrect={false}
          spellCheck={false}
          autoCapitalize="none"
          onBlur={(e) => e.preventDefault()}
          keyboardType={Platform.OS === 'ios' ? 'decimal-pad' : 'numeric'}
        />
      );
    }

    return (
      <View style={styles.toAmountContainer}>
        {isAmountLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Text style={styles.toAmount}>{amount || '0.00'}</Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.coinSelector}>
        {renderCoinItem()}
      </View>
      {renderAmount()}
    </View>
  );
};

export default CoinSelector; 