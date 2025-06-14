import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useStyles = () => {
	const insets = useSafeAreaInsets();
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;

	const createSnackbarWrapperStyle = () => ({
		top: insets.top,
	});

	const createSnackbarStyle = (toastType: string) => [
		{
			borderRadius: theme.spacing.sm,
			elevation: 4,
			marginHorizontal: insets.left + 10,
			shadowColor: '#000',
			shadowOffset: {
				width: 0,
				height: 2,
			},
			shadowOpacity: 0.25,
			shadowRadius: 3.84,
		},
		toastType === "error" ? { backgroundColor: theme.colors.error } :
		toastType === "success" ? { backgroundColor: theme.success } :
		toastType === "warning" ? { backgroundColor: theme.warning } :
		{ backgroundColor: theme.colors.surfaceVariant }
	];

	const createMessageTextStyle = (toastForegroundColor: string) => [
		{
			flex: 1,
			marginLeft: theme.spacing.sm,
		},
		{ color: toastForegroundColor }
	];

	const styles = StyleSheet.create({
		closeButton: {
			marginLeft: theme.spacing.sm,
			padding: theme.spacing.xs,
		},
		content: {
			alignItems: 'center',
			flexDirection: 'row',
			justifyContent: 'space-between',
			paddingRight: theme.spacing.sm,
		},
		error: {
			backgroundColor: theme.colors.error,
		},
		info: {
			backgroundColor: theme.colors.surfaceVariant,
		},
		message: {
			flex: 1,
			marginLeft: theme.spacing.sm,
		},
		messageContainer: {
			alignItems: 'center',
			flexDirection: 'row',
			flex: 1,
		},
		snackbarStyleBase: {
			borderRadius: theme.spacing.sm,
			elevation: 4,
			marginHorizontal: insets.left + 10,
			shadowColor: '#000',
			shadowOffset: {
				width: 0,
				height: 2,
			},
			shadowOpacity: 0.25,
			shadowRadius: 3.84,
		},
		statusIcon: {
			backgroundColor: 'transparent',
			marginRight: theme.spacing.sm,
		},
		success: {
			backgroundColor: theme.success,
		},
		warning: {
			backgroundColor: theme.warning,
		},
		wrapper: {
			top: insets.top,
		},
	});

	return {
		...styles,
		colors,
		theme,
		createSnackbarWrapperStyle,
		createSnackbarStyle,
		createMessageTextStyle
	};
};
