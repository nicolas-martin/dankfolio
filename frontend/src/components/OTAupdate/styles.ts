import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
	container: {
		alignItems: 'flex-end',
		marginBottom: theme.spacing.xs,
		marginRight: theme.spacing.sm,
		marginTop: theme.spacing.xs,
	},
	link: {
		paddingHorizontal: theme.spacing.xs,
		paddingVertical: 2,
	},
	linkText: {
		color: theme.colors.primary, // blue link color
		fontSize: theme.typography.fontSize.xs,
		textDecorationLine: 'underline',
	},
	statusText: {
		color: theme.colors.onSurfaceVariant, // Was #888
		fontSize: 10,
		marginTop: 2,
	},
}); 
