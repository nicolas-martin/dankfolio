import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const useStyles = () => {
	const insets = useSafeAreaInsets();
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;

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
			marginHorizontal: insets.left + 10,
		},
		statusIcon: {
			marginRight: theme.spacing.sm,
		},
		success: {
			backgroundColor: theme.success,
		},
		wrapper: {
			top: insets.top,
		},
	});

	return {
		...styles,
		colors,
		theme
	};
};
