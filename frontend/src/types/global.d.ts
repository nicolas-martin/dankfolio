declare namespace NodeJS {
    interface Timeout {
        _destroyed?: boolean;
        _idleNext?: Timeout;
        _idlePrev?: Timeout;
        _idleStart?: number;
        _idleTimeout?: number;
        _onTimeout?: () => void;
        _repeat?: number | null;
    }
} 

// Added for react-native-paper theme augmentation
import 'react-native-paper';
import { AppTheme } from '@/utils/theme';

declare global {
  namespace ReactNativePaper {
    interface Theme extends AppTheme {}
  }
}
