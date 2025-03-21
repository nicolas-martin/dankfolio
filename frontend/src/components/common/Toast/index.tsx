import React, { createContext, useContext, useState, useCallback } from 'react';
import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { openSolscanUrl } from '../../../utils/solana';
import { theme } from '../../../utils/theme';
import { ToastProps, ToastContextProps } from './types';
import * as S from './styles';

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

  const toastIcons = {
    success: '✓',
    error: '!',
    info: 'ℹ',
    warning: '!',
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

  const getGradientColors = () => {
    switch (type) {
      case 'success':
        return [theme.colors.success + '15', theme.colors.success + '05'] as const;
      case 'error':
        return [theme.colors.error + '15', theme.colors.error + '05'] as const;
      case 'warning':
        return [theme.colors.warning + '15', theme.colors.warning + '05'] as const;
      default:
        return [theme.colors.primary + '15', theme.colors.primary + '05'] as const;
    }
  };

  return (
    <S.ToastContainer style={{ opacity, transform: [{ translateY }] }}>
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: theme.borderRadius.md,
          padding: theme.spacing.lg,
          ...theme.shadows.md,
        }}
      >
        <S.ToastContent>
          <S.MessageContainer>
            <S.LeftContent>
              {(icon || toastIcons[type]) && (
                <S.IconContainer type={type}>
                  <S.Icon type={type}>{icon || toastIcons[type]}</S.Icon>
                </S.IconContainer>
              )}
              <S.TextContainer>
                <S.Title>
                  {type.charAt(0).toUpperCase() + type.slice(1)}!
                </S.Title>
                <S.Message>{message}</S.Message>
              </S.TextContainer>
            </S.LeftContent>
            <S.CloseButton onPress={hideToast}>
              <S.CloseButtonText>✕</S.CloseButtonText>
            </S.CloseButton>
          </S.MessageContainer>
          {allActions.length > 0 && (
            <S.ActionsContainer>
              {allActions.map((action, index) => (
                <S.ActionButton
                  key={index}
                  onPress={action.onPress}
                >
                  <S.ActionButtonText type={type}>
                    {action.label}
                  </S.ActionButtonText>
                </S.ActionButton>
              ))}
            </S.ActionsContainer>
          )}
        </S.ToastContent>
      </LinearGradient>
    </S.ToastContainer>
  );
};

export default Toast; 