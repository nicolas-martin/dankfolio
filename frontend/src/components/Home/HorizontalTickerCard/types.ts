import { Coin } from '@/types'; // Assuming Coin type is available

export interface HorizontalTickerCardProps {
    coin: Coin; // Or select specific fields if Coin is too broad
    onPress: (coin: Coin) => void;
}
