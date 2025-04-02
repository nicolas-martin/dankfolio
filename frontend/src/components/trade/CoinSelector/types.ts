import { TextInput } from 'react-native';
import { Coin } from '../../../types';

export interface CoinSelectorProps {
  label: string;
  selectedCoin: Coin | undefined;
  amount: string;
  onAmountChange?: (amount: string) => void;
  isInput?: boolean;
  inputRef?: React.RefObject<TextInput>;
  approxValue?: string;
  rateText?: string;
  isAmountLoading?: boolean;
} 