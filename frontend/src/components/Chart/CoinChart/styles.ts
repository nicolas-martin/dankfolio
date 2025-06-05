import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	chartContainer: {
		height: 250,
	},
	loadingContainer: {
		height: 250,
		justifyContent: 'center',
		alignItems: 'center',
	},
	hoverTimeText: {
		position: 'absolute',
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
		textAlign: 'center',
	},
	hoverLabel: {
		position: 'absolute',
		width: 120,
		alignItems: 'center',
		pointerEvents: 'none',
	},
	dottedLine: {
		borderStyle: 'dotted',
		borderWidth: 1,
		borderColor: theme.colors.outlineVariant,
	},
	gainGradient: {
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		colors: [theme.colors.primary, 'transparent'],
	},
	lossGradient: {
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		colors: [theme.colors.error, 'transparent'],
	},
});
