import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

// Define spacing and typography constants
const spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
};

const typography = {
	fontSize: {
		sm: 12,
		base: 14,
		lg: 16,
		xl: 18,
		'2xl': 20,
		'3xl': 24,
	},
};

const borderRadius = {
	sm: 4,
	md: 8,
	lg: 12,
};

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	content: {
		flex: 1,
	},
	coinsSection: {
		flex: 1,
	},
	sectionHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: 'bold',
		color: theme.colors.onSurface,
	},
	coinsList: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	loadingText: {
		fontSize: 18,
		marginBottom: 16,
		color: theme.colors.onSurface,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	noCoinsContainer: {
		padding: 16,
		alignItems: 'center',
	},
	noCoinsText: {
		fontSize: 16,
		color: theme.colors.onSurfaceVariant,
	},
	profileContainer: {
		padding: 16,
	},
});
