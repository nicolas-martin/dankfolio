import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	chartContainer: {
		height: 250,
		backgroundColor: '#14171A', // Dark background color to match screenshot
		borderRadius: 8,
		overflow: 'hidden',
	},
	loadingContainer: {
		height: 250,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#14171A',
		borderRadius: 8,
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
});
