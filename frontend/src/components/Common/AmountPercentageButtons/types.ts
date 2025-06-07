export interface AmountPercentageButtonsProps {
  balance: number | undefined; // Balance of the token
  onSelectAmount: (amount: string) => void; // Callback with the calculated amount string
  style?: object; // Optional style for the container
}
