export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastAction = {
	label: string;
	onPress: () => void;
	style?: 'primary' | 'secondary';
};

export interface ToastProps {
	message: string;
	type?: ToastType;
	duration?: number;
	visible?: boolean;
	actions?: ToastAction[];
	icon?: string;
	txHash?: string;
}

export interface ToastContextProps {
	showToast: (props: Partial<ToastProps>) => void;
	hideToast: () => void;
}
