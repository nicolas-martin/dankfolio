import {
	CheckIcon,
	WarningIcon,
	LinkIcon,
} from '@components/Common/Icons';
import { ToastType } from './toast_types';

export const getToastIcon = (type: ToastType) => {
	switch (type) {
		case 'success':
			return CheckIcon;
		case 'warning':
		case 'error':
			return WarningIcon;
		case 'info':
		default:
			return LinkIcon;
	}
};
