import styled from '@emotion/native';
import { Animated } from 'react-native';
import { theme } from '../../../utils/theme';
import { ToastProps } from './toast_types';

export const ToastContainer = styled(Animated.View)`
  position: absolute;
  top: 40px;
  left: 20px;
  right: 20px;
  z-index: 9999;
`;

export const ToastContent = styled.View`
  gap: ${theme.spacing.md}px;
`;

export const MessageContainer = styled.View`
  flex-direction: row;
  justify-content: space-between;
  align-items: flex-start;
`;

export const LeftContent = styled.View`
  flex-direction: row;
  flex: 1;
  gap: ${theme.spacing.md}px;
`;

export const IconContainer = styled.View<{ type: ToastProps['type'] }>`
  width: 32px;
  height: 32px;
  border-radius: 16px;
  justify-content: center;
  align-items: center;
  background-color: ${props => {
		switch (props.type) {
			case 'success':
				return theme.colors.success + '15';
			case 'error':
				return theme.colors.error + '15';
			case 'warning':
				return theme.colors.warning + '15';
			default:
				return theme.colors.primary + '15';
		}
	}};
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
  color: ${theme.colors.text};
  margin-bottom: 2px;
`;

export const Message = styled.Text`
  color: ${theme.colors.textSecondary};
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
  color: ${theme.colors.textSecondary};
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
