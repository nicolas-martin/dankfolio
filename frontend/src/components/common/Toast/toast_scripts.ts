import { Animated } from 'react-native';
import { theme } from '../../../utils/theme';
import { openSolscanUrl } from '../../../utils/url';
import { ToastType, ToastAction } from './toast_types';
import { INITIAL_POSITION, FINAL_POSITION } from './toast_styles';

export const ANIMATION_DURATION = 300;
export const TOAST_DISPLAY_DURATION = 5000;

export const TOAST_ICONS: Record<ToastType, string> = {
	success: '✓',
	error: '✕',
	info: 'ℹ',
	warning: '!',
};

export const getGradientColors = (type: ToastType) => {
	switch (type) {
		case 'success':
			return ['#2A3244', '#2A3244'] as const;
		case 'error':
			return ['#2A3244', '#2A3244'] as const;
		case 'warning':
			return ['#2A3244', '#2A3244'] as const;
		default:
			return ['#2A3244', '#2A3244'] as const;
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
			toValue: FINAL_POSITION,
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
				toValue: INITIAL_POSITION,
				duration: ANIMATION_DURATION,
				useNativeDriver: true,
			})
		]).start(() => hideToast());
	}, TOAST_DISPLAY_DURATION);

	return timer;
};
