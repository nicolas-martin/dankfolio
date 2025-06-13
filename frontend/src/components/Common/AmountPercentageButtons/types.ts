import { StyleProp, ViewStyle } from 'react-native';

export interface AmountPercentageButtonsProps {
  balance: number | undefined; // Balance of the token
  onSelectAmount: (amount: string) => void; // Callback with the calculated amount string
  style?: StyleProp<ViewStyle>; // Properly typed style for the container
  tokenKey?: string; // Optional key to track when token changes (e.g., mintAddress)
}
