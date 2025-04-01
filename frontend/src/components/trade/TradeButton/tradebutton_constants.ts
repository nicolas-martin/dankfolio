import { MD3Colors } from 'react-native-paper/lib/typescript/types';
import { ICON_CHECK, ICON_WARNING } from '../../../utils/icons';

type ColorKey = keyof MD3Colors;

interface ButtonStateConfig {
  icon?: any; // Icon component accepts various types
  bg: ColorKey;
  color: ColorKey;
}

export const BUTTON_STATES: Record<string, ButtonStateConfig> = {
  default: {
    bg: 'primary',
    color: 'onPrimary',
  },
  processing: {
    bg: 'primary',
    color: 'onPrimary',
  },
  disabled: {
    bg: 'surfaceDisabled',
    color: 'onSurfaceDisabled',
  },
  error: {
    icon: ICON_WARNING,
    bg: 'error',
    color: 'onError',
  },
  success: {
    icon: ICON_CHECK,
    bg: 'primary',
    color: 'onPrimary',
  },
} as const;

export type ButtonState = keyof typeof BUTTON_STATES;