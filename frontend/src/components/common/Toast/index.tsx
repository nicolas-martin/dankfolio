import React, { createContext, useContext, useState, useCallback } from 'react';
import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../utils/theme';
import { ToastProps, ToastContextProps } from './types';
import * as S from './styles';
import { 
  TOAST_ICONS, 
  getGradientColors, 
  getToastActions, 
  animateToast 
} from './scripts';

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
    const timer = animateToast(opacity, translateY, hideToast);
    return () => clearTimeout(timer);
  }, []);

  const allActions = getToastActions(actions, txHash);

  return (
    <S.ToastContainer style={{ opacity, transform: [{ translateY }] }}>
      <LinearGradient
        colors={getGradientColors(type)}
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
              {(icon || TOAST_ICONS[type]) && (
                <S.IconContainer type={type}>
                  <S.Icon type={type}>{icon || TOAST_ICONS[type]}</S.Icon>
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