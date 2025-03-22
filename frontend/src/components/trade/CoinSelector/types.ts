import { Coin } from '../../../types/index';
import { TextInput } from 'react-native';

export interface CoinSelectorProps {
  label: string;
  selectedCoin?: Coin;
  amount: string;
  isAmountLoading?: boolean;
  onAmountChange?: (amount: string) => void;
  onCoinSelect?: (coinId: string) => void;
  isInput?: boolean;
  inputRef?: React.RefObject<TextInput>;
}  