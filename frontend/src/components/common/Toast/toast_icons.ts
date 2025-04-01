import {
  ICON_CHECK,
  ICON_WARNING,
  ICON_LINK,
} from '../../../utils/icons';
import { ToastType } from './toast_types';

export const getToastIcon = (type: ToastType) => {
  switch (type) {
    case 'success':
      return ICON_CHECK;
    case 'warning':
    case 'error':
      return ICON_WARNING;
    case 'info':
    default:
      return ICON_LINK;
  }
};