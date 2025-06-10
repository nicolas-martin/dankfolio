import Clipboard from '@react-native-clipboard/clipboard';
import { NotificationProps } from '@/types';
export const copyToClipboard = async (text: string, type: string, showToast: (props: NotificationProps) => void) => {
	try {
		Clipboard.setString(text);
		showToast({
			type: 'success',
			message: `${type} address copied to clipboard`,
			duration: 2000
		});
	} catch (_error) {
		// Handle error silently or log if needed
		return [];
	}
};
