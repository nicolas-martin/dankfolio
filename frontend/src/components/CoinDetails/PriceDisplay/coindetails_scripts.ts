import Clipboard from '@react-native-clipboard/clipboard';
import { NotificationProps } from '@/types';
export const formatAddress = (address: string): string => {
	if (!address) return '';
	return `${address.slice(0, 4)}...${address.slice(-4)}`;
};
export const copyToClipboard = async (text: string, type: string, showToast: (props: NotificationProps) => void) => {
	try {
		Clipboard.setString(text);
		showToast({
			type: 'success',
			message: `${type} address copied to clipboard`,
			duration: 2000
		});
	} catch (error) {
		showToast({
			type: 'error',
			message: 'Failed to copy to clipboard',
			duration: 2000
		});
	}
};
