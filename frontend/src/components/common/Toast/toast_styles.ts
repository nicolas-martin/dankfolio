import styled from '@emotion/native';
import { Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../utils/theme';
import { ToastProps } from './toast_types';

export const ToastContainer = styled(Animated.View)`
  position: absolute;
  top: 40px;
  left: 16px;
  right: 16px;
  z-index: 999999;
`;

export const GradientBackground = styled(LinearGradient)`
  border-radius: 12px;
  padding: 16px;
  shadow-color: #000000;
  shadow-offset: 0px 8px;
  shadow-opacity: 0.35;
  shadow-radius: 12px;
  elevation: 12;
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.1);
`;

// Default gradient props
export const GRADIENT_PROPS = {
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 }
} as const;

// Animation values for reuse
export const INITIAL_POSITION = -100;
export const FINAL_POSITION = 0;

// Animation configuration
export const getAnimatedStyle = (opacity: Animated.Value, translateY: Animated.Value) => ({
  opacity,
  transform: [{ translateY }]
});

export const ToastContent = styled.View`
  gap: 12px;
`;

export const MessageContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

export const LeftContent = styled.View`
  flex-direction: row;
  flex: 1;
  gap: 12px;
  align-items: center;
`;

export const IconContainer = styled.View<{ type: ToastProps['type'] }>`
  width: 24px;
  height: 24px;
  border-radius: 12px;
  justify-content: center;
  align-items: center;
  background-color: ${props => {
    switch (props.type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      default:
        return '#2196F3';
    }
  }};
  border-width: 1px;
  border-color: rgba(255, 255, 255, 0.2);
`;

export const Icon = styled.Text<{ type: ToastProps['type'] }>`
  font-size: ${theme.typography.fontSize.base}px;
  font-family: ${theme.typography.fontFamily.semiBold};
  color: ${props => {
		switch (props.type) {
			case 'success':
				return theme.colors.success;
			case 'error':
				return theme.colors.error;
			case 'warning':
				return theme.colors.warning;
			default:
				return theme.colors.primary;
		}
	}};
`;

export const TextContainer = styled.View`
  flex: 1;
  gap: 4px;
`;

export const Title = styled.Text`
  font-size: ${theme.typography.fontSize.base}px;
  font-family: ${theme.typography.fontFamily.semiBold};
  color: #FFFFFF;
  margin-bottom: 2px;
`;

export const Message = styled.Text`
  color: rgba(255, 255, 255, 0.8);
  font-size: ${theme.typography.fontSize.sm}px;
  font-family: ${theme.typography.fontFamily.regular};
  line-height: 20px;
  flex: 1;
`;

export const CloseButton = styled.TouchableOpacity`
  padding: ${theme.spacing.xs}px;
  margin-left: ${theme.spacing.md}px;
`;

export const CloseButtonText = styled.Text`
  color: rgba(255, 255, 255, 0.6);
  font-size: ${theme.typography.fontSize.lg}px;
  opacity: 0.8;
`;

export const ActionsContainer = styled.View`
  flex-direction: row;
  justify-content: flex-start;
  padding-top: ${theme.spacing.xs}px;
  gap: ${theme.spacing.lg}px;
`;

export const ActionButton = styled.TouchableOpacity`
  padding: ${theme.spacing.xs}px;
`;

export const ActionButtonText = styled.Text<{ type: ToastProps['type'] }>`
  font-family: ${theme.typography.fontFamily.medium};
  font-size: ${theme.typography.fontSize.sm}px;
  color: ${props => {
		switch (props.type) {
			case 'success':
				return theme.colors.success;
			case 'error':
				return theme.colors.error;
			case 'warning':
				return theme.colors.warning;
			default:
				return theme.colors.primary;
		}
	}};
`;
