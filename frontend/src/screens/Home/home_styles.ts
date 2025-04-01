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
	header: {
		paddingHorizontal: spacing.xl,
		paddingTop: spacing.xl,
		paddingBottom: spacing.md,
		alignItems: 'center',
	},
	title: {
		fontSize: typography.fontSize['3xl'],
		fontWeight: 'bold',
		color: theme.colors.onSurface,
		marginBottom: spacing.xs,
	},
	subtitle: {
		fontSize: typography.fontSize.base,
		color: theme.colors.onSurfaceVariant,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: borderRadius.sm,
		padding: spacing.md,
		marginBottom: spacing.xl,
	},
	searchInput: {
		flex: 1,
		color: theme.colors.onSurface,
		marginLeft: spacing.sm,
	},
	content: {
		flex: 1,
	},
	listContainer: {
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
	coinItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.outline,
	},
	coinInfo: {
		flex: 1,
		marginLeft: spacing.lg,
	},
	coinName: {
		fontSize: typography.fontSize.base,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	coinSymbol: {
		fontSize: typography.fontSize.sm,
		color: theme.colors.onSurfaceVariant,
		marginTop: spacing.xs,
	},
	priceInfo: {
		alignItems: 'flex-end',
	},
	price: {
		fontSize: typography.fontSize.base,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	priceChange: {
		fontSize: typography.fontSize.sm,
		fontWeight: '600',
		letterSpacing: 0.25,
	},
	positive: {
		color: theme.colors.primary,
	},
	negative: {
		color: theme.colors.error,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: theme.colors.background,
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
	errorText: {
		color: theme.colors.error,
		textAlign: 'center',
		marginHorizontal: spacing.xl,
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
	notification: {
		position: 'absolute',
		top: spacing.xl,
		left: spacing.xl,
		right: spacing.xl,
		padding: spacing.lg,
		borderRadius: borderRadius.md,
		zIndex: 1000,
	},
	notificationText: {
		color: theme.colors.onSurface,
		textAlign: 'center',
		fontWeight: 'bold',
	},
});
