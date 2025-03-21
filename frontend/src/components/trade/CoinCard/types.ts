import { Coin } from '../../../types/index';

export interface CoinCardProps {
  coin: Coin;
  onPress: (coin: Coin) => void;
} 