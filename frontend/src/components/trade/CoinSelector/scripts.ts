import { Coin } from '../../../types/index';

export const DEFAULT_ICON = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

export const getCoinIcon = (coinObj?: Coin): string => {
  if (!coinObj) return DEFAULT_ICON;
  return coinObj.icon_url || DEFAULT_ICON;
};

export const renderCoinBalance = (coin: Coin) => {
  return {
    balance: coin.balance?.toFixed(9) || '0.000000000',
    value: (coin.price * (coin.balance || 0)).toFixed(4)
  };
}; 