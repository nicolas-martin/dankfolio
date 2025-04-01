import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';
import { Portal, Snackbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastProps, ToastType } from './toast_types';
import {
  ICON_CHECK,
  ICON_WARNING,
  ICON_LINK,
} from '../../../utils/icons';

const ToastContext = createContext<{ showToast: (options: ToastProps) => void; hideToast: () => void } | null>(null);

const defaults: ToastProps = {
  message: '',
  type: 'info',
  duration: 3000,
  visible: false,
};

type ToastAction = 
  | { type: 'SHOW'; payload: Partial<ToastProps> }
  | { type: 'HIDE' }
  | { type: 'HYDRATE'; payload: ToastProps };

const reducer = (state: ToastProps, action: ToastAction): ToastProps => {
  switch (action.type) {
    case 'SHOW':
      return { ...state, ...action.payload, visible: true };
    case 'HYDRATE':
      return { ...state, ...action.payload, visible: false };
    case 'HIDE':
      return { ...state, visible: false };
    default:
      return state;
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, defaults);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const toast = useMemo(
    () => ({
      showToast(options: Partial<ToastProps>) {
        dispatch({ type: 'SHOW', payload: options });
      },
      hideToast() {
        dispatch({ type: 'HIDE' });
      },
    }),
    []
  );

  const getToastColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return theme.colors.primary;
      case 'error':
        return theme.colors.error;
      case 'info':
        return theme.colors.secondary;
      case 'warning':
        return '#FFA000'; // Hardcode warning color
      default:
        return theme.colors.primary;
    }
  };

  const styles = StyleSheet.create({
    snackbar: {
      position: 'absolute',
      left: insets.left,
      right: insets.right,
      bottom: insets.bottom,
      backgroundColor: theme.colors.surfaceVariant,
      borderRadius: 8,
    },
    content: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    message: {
      color: theme.colors.onSurface,
      marginLeft: 8,
      flex: 1,
    },
  });

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Portal>
        <Snackbar
          visible={state.visible || false}
          onDismiss={toast.hideToast}
          duration={state.duration}
          style={[styles.snackbar, { borderLeftColor: getToastColor(state.type || 'info'), borderLeftWidth: 4 }]}
        >
          <View style={styles.content}>
            <Text style={styles.message}>{state.message}</Text>
          </View>
        </Snackbar>
      </Portal>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return toast;
};

export default ToastProvider;
