import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { openSolscanUrl } from '../utils/solana';

interface ToastAction {
  label: string;
  onPress: () => void;
  style?: 'primary' | 'secondary';
}

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  actions?: ToastAction[];
  icon?: string;
  txHash?: string;
}

interface ToastContextProps {
  showToast: (props: ToastProps) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextProps | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastProps | null>(null);

  const showToast = useCallback((props: ToastProps) => {
    setToast(props);
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && <Toast {...toast} />}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const Toast: React.FC<ToastProps> = ({ 
  message, 
  type = 'info', 
  actions = [],
  icon,
  txHash 
}) => {
  const { hideToast } = useToast();
  const opacity = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(-100)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start(() => hideToast());
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const toastStyles = {
    success: {
      iconColor: '#4CAF50',
      icon: '✓',
    },
    error: {
      iconColor: '#DC3545',
      icon: '!',
    },
    info: {
      iconColor: '#2196F3',
      icon: 'ℹ',
    },
    warning: {
      iconColor: '#FF9800',
      icon: '!',
    },
  };

  // Add Solscan action if txHash is present
  const allActions = [...actions];
  if (txHash) {
    allActions.push({
      label: 'View on Solscan',
      onPress: () => openSolscanUrl(txHash),
      style: 'secondary',
    });
  }

  return (
    <Animated.View style={[
      styles.container, 
      { 
        opacity,
        transform: [{ translateY }],
      }
    ]}>
      <View style={styles.content}>
        <View style={styles.messageContainer}>
          <View style={styles.leftContent}>
            {(icon || toastStyles[type].icon) && (
              <View style={[styles.iconContainer, { backgroundColor: toastStyles[type].iconColor + '15' }]}>
                <Text style={[styles.icon, { color: toastStyles[type].iconColor }]}>
                  {icon || toastStyles[type].icon}
                </Text>
              </View>
            )}
            <View style={styles.textContainer}>
              <Text style={styles.title}>
                {type.charAt(0).toUpperCase() + type.slice(1)}!
              </Text>
              <Text style={styles.message}>{message}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
        {allActions.length > 0 && (
          <View style={styles.actionsContainer}>
            {allActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                onPress={action.onPress}
                style={styles.actionButton}
              >
                <Text style={[
                  styles.actionButtonText,
                  { color: toastStyles[type].iconColor }
                ]}>
                  {action.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 20,
    right: 20,
    padding: 16,
    backgroundColor: '#252542',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 5,
    zIndex: 9999,
  },
  content: {
    gap: 12,
  },
  messageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  leftContent: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 16,
    fontWeight: '600',
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  message: {
    color: '#AAAACC',
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  closeButton: {
    padding: 4,
    marginLeft: 12,
  },
  closeButtonText: {
    color: '#AAAACC',
    fontSize: 18,
    opacity: 0.8,
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingTop: 4,
    gap: 16,
  },
  actionButton: {
    paddingVertical: 4,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 