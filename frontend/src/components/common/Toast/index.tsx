import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { Portal, Snackbar, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ToastProps, ToastType } from './toast_types';
import { createStyles } from './toast_styles';
import { getToastColor } from './toast_constants';
import { ToastContent } from './ToastContent';

const ToastContext = createContext<{
  showToast: (options: ToastProps) => void;
  hideToast: () => void;
} | null>(null);

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

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <Portal>
        <Snackbar
          visible={state.visible || false}
          onDismiss={toast.hideToast}
          duration={state.duration}
          style={[
            styles.snackbar,
            {
              borderLeftColor: getToastColor(state.type || 'info', theme),
              borderLeftWidth: 4,
            },
          ]}
        >
          <ToastContent
            message={state.message}
            type={state.type || 'info'}
            onClose={toast.hideToast}
            styles={styles}
          />
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

// Standalone Toast component for backward compatibility
const Toast: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [state, dispatch] = useReducer(reducer, defaults);
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

  return (
    <ToastContext.Provider value={toast}>
      <Portal>
        <Snackbar
          visible={state.visible || false}
          onDismiss={toast.hideToast}
          duration={state.duration}
          style={[
            styles.snackbar,
            {
              borderLeftColor: getToastColor(state.type || 'info', theme),
              borderLeftWidth: 4,
            },
          ]}
        >
          <ToastContent
            message={state.message}
            type={state.type || 'info'}
            onClose={toast.hideToast}
            styles={styles}
          />
        </Snackbar>
      </Portal>
    </ToastContext.Provider>
  );
};

export { Toast };
export default ToastProvider;
