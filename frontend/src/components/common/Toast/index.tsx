import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { View } from 'react-native';
import { Portal, Snackbar, useTheme, Text, IconButton } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastProps, ToastType } from './toast_types';
import { createStyles } from './toast_styles';
import { getToastBackgroundColor, getToastForegroundColor } from './toast_constants';
import { getToastIcon } from './toast_icons';

const ToastContext = createContext<{
  showToast: (options: ToastProps) => void;
  hideToast: () => void;
} | null>(null);

const defaults: ToastProps = {
  message: '',
  type: 'info',
  duration: 103000,
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
  const styles = createStyles(theme, insets);

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

  const toastType = state.type || 'info';
  const toastForegroundColor = getToastForegroundColor(toastType, theme);
  const ToastIcon = getToastIcon(toastType);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Portal>
        <Snackbar
          visible={state.visible || false}
          onDismiss={toast.hideToast}
          duration={state.duration}
          wrapperStyle={{
            top: insets.top,
          }}
          style={{
            backgroundColor: getToastBackgroundColor(toastType, theme),
            borderRadius: 8,
            marginHorizontal: insets.left + 10,
          }}
        >
          <View style={styles.content}>
            <View style={styles.messageContainer}>
              <ToastIcon 
                size={20} 
                color={toastForegroundColor} 
                style={styles.statusIcon}
              />
              <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
                {state.message}
              </Text>
            </View>
            <IconButton
              icon="close"
              size={20}
              onPress={toast.hideToast}
              style={styles.closeButton}
              iconColor={theme.colors.onSurfaceVariant}
            />
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
