export interface ToastAction {
  label: string;
  onPress: () => void;
  style?: 'primary' | 'secondary';
}

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  actions?: ToastAction[];
  icon?: string;
  txHash?: string;
}

export interface ToastContextProps {
  showToast: (props: ToastProps) => void;
  hideToast: () => void;
} 