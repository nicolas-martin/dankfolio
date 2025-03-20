import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Coin } from '../types/index';

const DEFAULT_ICON = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

interface CoinSelectorProps {
  label: string;
  selectedCoin?: Coin;
  amount: string;
  isAmountLoading?: boolean;
  onAmountChange?: (amount: string) => void;
  onCoinSelect: (coinId: string) => void;
  isInput?: boolean;
  inputRef?: React.RefObject<TextInput>;
}

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
            {selectedCoin.balance?.toFixed(4) || '0.0000'}
          </Text>
          <Text style={styles.valueText}>
            ${(selectedCoin.price * (selectedCoin.balance || 0)).toFixed(2)}
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
          placeholderTextColor="#9F9FD5"
          selectionColor="#6A5ACD"
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
          <ActivityIndicator size="small" color="#6A5ACD" />
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

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    color: '#9F9FD5',
    marginBottom: 10,
  },
  coinSelector: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  coinIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  coinInfo: {
    flex: 1,
  },
  coinSymbol: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  coinName: {
    color: '#9F9FD5',
    fontSize: 12,
  },
  balanceSection: {
    alignItems: 'flex-end',
  },
  balanceText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  valueText: {
    color: '#9F9FD5',
    fontSize: 12,
    marginTop: 2,
  },
  placeholderText: {
    color: '#9F9FD5',
  },
  amountInput: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    padding: 15,
    color: '#fff',
    fontSize: 24,
    textAlign: 'right',
  },
  toAmountContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 10,
    padding: 15,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  toAmount: {
    color: '#fff',
    fontSize: 24,
  },
});

export default CoinSelector; 