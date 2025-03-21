import { Coin } from '../../../types/index';
import { TokenInfo } from '../../../services/api';

export interface TokenCardProps {
    token: Coin | TokenInfo;
    balance: number;
    onPress: () => void;
}
