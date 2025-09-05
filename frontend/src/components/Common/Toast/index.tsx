import React, { createContext, useContext, useMemo, useReducer } from 'react';
import { View } from 'react-native';
import { Portal, Snackbar, Text, IconButton } from 'react-native-paper';
import { ToastProps, ToastType } from './toast_types';
import { useStyles } from './toast_styles';
import { getToastIcon as getOriginalToastIconComponent } from './toast_icons';
import { ErrorAnimation } from '../Animations';

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

// Format error message for user display
const formatErrorMessage = (message: string): string => {
	// Handle gRPC errors
	if (message.includes('[internal]')) {
		const grpcMatch = message.match(/failed to ([\w\s]+):/);
		if (grpcMatch) {
			return `Failed to ${grpcMatch[1]}. Please try again.`;
		}
	}

	// Handle RPC errors
	if (message.includes('RPCError')) {
		if (message.includes('Method not found')) {
			return 'Network connection error. Please check your connection and try again.';
		}
	}

	return message;
};

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
	const styles = useStyles();

	const toast = useMemo(
		() => ({
			showToast(options: Partial<ToastProps>) {
				// Log errors when toast type is 'error'
				if (options.type === 'error') {
					const errorData = options.data ? { data: options.data } : {};

					// Detailed error logging for debugging
					console.error('� Error:', options.message, errorData);

					// Format message for user display
					const userMessage = formatErrorMessage(options.message || '');
					dispatch({ type: 'SHOW', payload: { ...options, message: userMessage } });
				} else {
					dispatch({ type: 'SHOW', payload: options });
				}
			},
			hideToast() {
				dispatch({ type: 'HIDE' });
			},
		}),
		[]
	);

	const toastType = state.type || 'info';
	const toastForegroundColor = toastType === 'error' ? styles.colors.onError :
		toastType === 'success' ? styles.colors.onPrimary :
			toastType === 'warning' ? styles.colors.onError :
				styles.colors.onSurface;

	let IconToRender;
	// Ensure toastType is valid for getOriginalToastIconComponent by casting, as state.type can be undefined initially.
	const OriginalIcon = getOriginalToastIconComponent(toastType as ToastType);

	if (toastType === 'success') {
		// Use static icon for success instead of animation
		const SuccessIcon = getOriginalToastIconComponent('success' as ToastType);
		IconToRender = SuccessIcon ? <SuccessIcon size={20} color={toastForegroundColor} style={styles.statusIcon} /> : null;
	} else if (toastType === 'error') {
		IconToRender = <ErrorAnimation size={28} loop={false} autoPlay={true} style={styles.statusIcon} />;
	} else if (OriginalIcon) {
		// Ensure OriginalIcon is a valid component before rendering
		IconToRender = <OriginalIcon size={20} color={toastForegroundColor} style={styles.statusIcon} />;
	}
	// else IconToRender will be undefined, and nothing will be rendered for the icon if type is invalid and not success/error.



	return (
		<ToastContext.Provider value={toast}>
			{children}
			<Portal>
				<Snackbar
					visible={state.visible || false}
					onDismiss={toast.hideToast}
					duration={state.duration}
					wrapperStyle={styles.createSnackbarWrapperStyle()} // Applied
					style={styles.createSnackbarStyle(toastType)} // Applied
				>
					<View style={styles.content}>
						<View style={styles.messageContainer}>
							{IconToRender}
							<Text style={styles.createMessageTextStyle(toastForegroundColor)}>
								{state.message}
							</Text>
						</View>
						<IconButton
							icon="close"
							size={20}
							onPress={toast.hideToast}
							style={styles.closeButton}
							iconColor={toastForegroundColor}
						/>
					</View>
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

export default ToastProvider;
