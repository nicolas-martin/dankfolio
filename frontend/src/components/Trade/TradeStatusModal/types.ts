export type PollingStatus = 'polling' | 'confirmed' | 'finalized' | 'failed' | 'pending';

export interface TradeStatusModalProps {
  isVisible: boolean;
  onClose: () => void;
  txHash: string | null;
  status: PollingStatus;
  confirmations: number;
  error: string | null;
}