import { Animated } from 'react-native';
import { theme } from '../../../utils/theme';
import { openSolscanUrl } from '../../../utils/solana';
import { ToastType, ToastAction } from './toast_types';

export const ANIMATION_DURATION = 300;
export const TOAST_DISPLAY_DURATION = 5000;

export const TOAST_ICONS: Record<ToastType, string> = {
	success: '✓',
	error: '!',
	info: 'ℹ',
	warning: '!',
};

export const getGradientColors = (type: ToastType) => {
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

export const getToastActions = (actions: ToastAction[], txHash?: string): ToastAction[] => {
	const allActions = [...actions];
	if (txHash) {
		allActions.push({
			label: 'View on Solscan',
			onPress: () => openSolscanUrl(txHash),
			style: 'secondary',
		});
	}
	return allActions;
};

export const animateToast = (
	opacity: Animated.Value,
	translateY: Animated.Value,
	hideToast: () => void
) => {
	// Show animation
	Animated.parallel([
		Animated.timing(opacity, {
			toValue: 1,
			duration: ANIMATION_DURATION,
			useNativeDriver: true,
		}),
		Animated.timing(translateY, {
			toValue: 0,
			duration: ANIMATION_DURATION,
			useNativeDriver: true,
		})
	]).start();

	// Hide animation after delay
	const timer = setTimeout(() => {
		Animated.parallel([
			Animated.timing(opacity, {
				toValue: 0,
				duration: ANIMATION_DURATION,
				useNativeDriver: true,
			}),
			Animated.timing(translateY, {
				toValue: -100,
				duration: ANIMATION_DURATION,
				useNativeDriver: true,
			})
		]).start(() => hideToast());
	}, TOAST_DISPLAY_DURATION);

	return timer;
};
