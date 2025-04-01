import React from 'react';
import { Animated } from 'react-native';
import { ToastProps } from './toast_types';
import * as S from './toast_styles';
import {
	TOAST_ICONS,
	getGradientColors,
	getToastActions,
	animateToast
} from './toast_scripts';
import { useToastStore } from '../../../store/toast';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const toast = useToastStore((state) => state.toast);
	
	return (
		<>
			{children}
			{toast && <Toast {...toast} />}
		</>
	);
};

export const useToast = () => {
	const showToast = useToastStore((state) => state.showToast);
	const hideToast = useToastStore((state) => state.hideToast);
	return { showToast, hideToast };
};

const Toast: React.FC<ToastProps> = ({
	message,
	type = 'info',
	actions = [],
	icon,
	txHash
}) => {
	const hideToast = useToastStore((state) => state.hideToast);
	const opacity = React.useRef(new Animated.Value(0)).current;
	const translateY = React.useRef(new Animated.Value(S.INITIAL_POSITION)).current;

	React.useEffect(() => {
		const timer = animateToast(opacity, translateY, hideToast);
		return () => clearTimeout(timer);
	}, []);

	const allActions = getToastActions(actions, txHash);

	return (
		<S.ToastContainer style={S.getAnimatedStyle(opacity, translateY)}>
			<S.GradientBackground
				colors={getGradientColors(type)}
				{...S.GRADIENT_PROPS}
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
			</S.GradientBackground>
		</S.ToastContainer>
	);
};

export default Toast;
