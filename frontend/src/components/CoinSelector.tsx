import React from 'react';
import { View, Text, StyleSheet, Image, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Coin, RootStackParamList } from '../types/index';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

const DEFAULT_ICON = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

interface CoinSelectorProps {
  label: string;
  selectedCoin?: Coin;
  excludeCoinId?: string;
  amount: string;
  isAmountLoading?: boolean;
  onAmountChange?: (amount: string) => void;
  onCoinSelect: (coinId: string) => void;
  isInput?: boolean;
  inputRef?: React.RefObject<TextInput>;
}

type CoinSelectorNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const getCoinIcon = (coinObj?: Coin): string => {
  if (!coinObj) return DEFAULT_ICON;
  
  return coinObj.logo_url || coinObj.icon_url || coinObj.iconUrl || DEFAULT_ICON;
};

const CoinSelector: React.FC<CoinSelectorProps> = ({
  label,
  selectedCoin,
  excludeCoinId,
  amount,
  isAmountLoading,
  onAmountChange,
  onCoinSelect,
  isInput = false,
  inputRef,
}) => {
  const navigation = useNavigation<CoinSelectorNavigationProp>();

  const renderCoinItem = () => {
    if (!selectedCoin) return <Text style={styles.placeholderText}>Select coin</Text>;

    return (
      <View style={styles.coinContainer}>
        <Image
          source={{ uri: getCoinIcon(selectedCoin) }}
          style={styles.coinIcon}
          defaultSource={{ uri: DEFAULT_ICON }}
        />
        <View style={styles.coinInfo}>
          <Text style={styles.coinSymbol}>{selectedCoin.symbol}</Text>
          <Text style={styles.coinName}>{selectedCoin.name}</Text>
        </View>
        <Text style={styles.coinBalance}>
          Balance: {selectedCoin.balance?.toFixed(4) || '0.0000'}
        </Text>
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
      <Pressable
        style={styles.coinSelector}
        onPress={() =>
          navigation.navigate('CoinSelect', {
            onSelect: onCoinSelect,
            excludeCoinId,
            currentCoinId: selectedCoin?.id,
          })
        }
      >
        {renderCoinItem()}
      </Pressable>
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
  coinBalance: {
    color: '#9F9FD5',
    fontSize: 12,
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