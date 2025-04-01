import React, { useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text, Button, Icon, useTheme, Portal } from 'react-native-paper';
import { ToastProps, ToastType } from './toast_types';
import { useToastStore } from '../../../store/toast';
import {
  ICON_CHECK,
  ICON_WARNING,
  ICON_LINK,
} from '../../../utils/icons';

const TOAST_ICONS = {
  success: ICON_CHECK,
  error: ICON_WARNING,
  info: ICON_LINK,
  warning: ICON_WARNING,
};

const getToastColor = (type: ToastType, theme: any) => {
  switch (type) {
    case 'success':
      return theme.colors.primary; // Assuming primary is a good success color
    case 'error':
      return theme.colors.error;
    case 'info':
      return theme.colors.secondary; // Assuming secondary is a good info color
    case 'warning':
      return theme.colors.warning;
    default:
      return theme.colors.primary;
  }
};

export const useToast = () => {
  const showGlueToast = useToastStore((state) => state.showToast);
  const hideGlueToast = useToastStore((state) => state.hideToast);
  const theme = useTheme();
  const styles = createStyles(theme);

  const [visible, setVisible] = useState(false);
  const [toastProps, setToastProps] = useState<ToastProps | null>(null);

  const onDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  const createTransactionAction = useCallback((txHash: string) => ({
    label: 'View Transaction',
    onPress: () => {
      if (Platform.OS === 'web') {
        window.open(`https://solscan.io/tx/${txHash}`, '_blank');
      } else {
        // Handle opening URL in mobile app (e.g., using Linking)
        console.log(`Opening transaction in mobile app: https://solscan.io/tx/${txHash}`);
      }
    },
    style: 'secondary'
  }), []);

  const showToast = useCallback((props: ToastProps) => {
    setToastProps(props);
    setVisible(true);
    showGlueToast(props); // Still call the glue toast for now
  }, [createTransactionAction, showGlueToast, theme]);

  useEffect(() => {
    if (toastProps) {
      // Timeout to auto dismiss after 3 seconds
      const timeoutId = setTimeout(() => {
        setVisible(false);
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
  }, [toastProps, setVisible]);

  const ToastContent = () => {
    if (!toastProps) return null;

    const { message, type = 'info', actions = [], icon, txHash } = toastProps;
    const allActions = [
      ...actions,
      ...(txHash ? [createTransactionAction(txHash)] : [])
    ];
    const toastColor = getToastColor(type, theme);

    return (
      <Portal>
        <View style={[styles.toastContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
          <View style={styles.toastContent}>
            <View style={[styles.iconContainer, { backgroundColor: toastColor, opacity: 0.2 }]}>
              <Icon source={icon || TOAST_ICONS[type]} size={20} color={toastColor} />
            </View>
            <View style={styles.textContainer}>
              <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {message}
              </Text>
            </View>
          </View>
          {allActions.length > 0 && (
            <View style={styles.actionsContainer}>
              {allActions.map((action, index) => (
                <Button
                  key={index}
                  mode="outlined"
                  style={[styles.actionButton, { borderColor: toastColor }]}
                  labelStyle={{ color: toastColor, fontSize: 14 }}
                  onPress={action.onPress}
                >
                  {action.label}
                </Button>
              ))}
            </View>
          )}
        </View>
      </Portal>
    );
  };

  return { showToast, hideToast: hideGlueToast, ToastContent, visible, onDismiss };
};

const createStyles = (theme: any) => StyleSheet.create({
  toastContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  textContainer: {
    flex: 1,
  },
  actionsContainer: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    marginLeft: 8,
  },
});

export default () => {
  const { ToastContent, visible, onDismiss } = useToast();

  return (
    <>{visible ? <ToastContent /> : null}</>
  );
};
