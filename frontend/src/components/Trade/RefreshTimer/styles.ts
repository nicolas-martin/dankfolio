import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	timerCard: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		padding: 12,
		flexDirection: 'row',
		alignItems: 'center',
		elevation: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.05,
		shadowRadius: 2,
	},
	progressContainer: {
		width: 32,
		height: 32,
		marginRight: 12,
		position: 'relative',
		alignItems: 'center',
		justifyContent: 'center',
	},
	progressBarBackground: {
		width: 24,
		height: 4,
		backgroundColor: theme.colors.outline,
		borderRadius: 2,
		overflow: 'hidden',
	},
	progressBarFill: {
		height: '100%',
		backgroundColor: theme.colors.primary,
		borderRadius: 2,
	},
	timerIcon: {
		position: 'absolute',
	},
	textContainer: {
		flex: 1,
	},
	timerLabel: {
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
		fontWeight: '500',
		marginBottom: 2,
	},
	timerText: {
		fontSize: 14,
		color: theme.colors.onSurface,
		fontWeight: '600',
	},

}); 