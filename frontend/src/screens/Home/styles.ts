import { StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	header: {
		paddingHorizontal: theme.spacing.xl,
		paddingTop: theme.spacing.xl,
		paddingBottom: theme.spacing.md,
		alignItems: 'center',
	},
	title: {
		fontSize: theme.typography.fontSize['3xl'],
		fontWeight: 'bold',
		color: theme.colors.text,
		marginBottom: theme.spacing.xs,
	},
	subtitle: {
		fontSize: theme.typography.fontSize.base,
		color: theme.colors.textSecondary,
	},
	searchContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: theme.colors.containerBackground,
		borderRadius: theme.borderRadius.sm,
		padding: theme.spacing.md,
		marginBottom: theme.spacing.xl,
	},
	searchInput: {
		flex: 1,
		color: theme.colors.text,
		marginLeft: theme.spacing.sm,
	},
	content: {
		flex: 1,
		padding: theme.spacing.xl,
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
		marginBottom: theme.spacing.lg,
	},
	sectionTitle: {
		fontSize: theme.typography.fontSize.xl,
		fontWeight: 'bold',
		color: theme.colors.text,
	},
	refreshCoinsButton: {
		padding: theme.spacing.xs,
	},
	refreshCoinsText: {
		fontSize: theme.typography.fontSize.xl,
	},
	coinsList: {
		paddingBottom: theme.spacing.xl,
	},
	coinItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: theme.spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.border,
	},
	coinInfo: {
		flex: 1,
		marginLeft: theme.spacing.lg,
	},
	coinName: {
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
		color: theme.colors.text,
	},
	coinSymbol: {
		fontSize: theme.typography.fontSize.sm,
		color: theme.colors.textSecondary,
		marginTop: theme.spacing.xs,
	},
	priceInfo: {
		alignItems: 'flex-end',
	},
	price: {
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
		color: theme.colors.text,
	},
	priceChange: {
		fontSize: theme.typography.fontSize.sm,
		marginTop: theme.spacing.xs,
	},
	positiveChange: {
		color: theme.colors.success,
	},
	negativeChange: {
		color: theme.colors.error,
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: theme.colors.background,
	},
	loadingText: {
		color: theme.colors.text,
		marginTop: theme.spacing.sm,
	},
	centerContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: theme.colors.background,
	},
	errorText: {
		color: theme.colors.error,
		textAlign: 'center',
		marginHorizontal: theme.spacing.xl,
	},
	noCoinsContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	noCoinsText: {
		color: theme.colors.textSecondary,
		fontSize: theme.typography.fontSize.base,
	},
	profileContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: theme.spacing.xl,
	},
	profileButton: {
		backgroundColor: theme.colors.primary,
		padding: theme.spacing.lg,
		borderRadius: theme.borderRadius.md,
		alignItems: 'center',
		flex: 1,
	},
	profileButtonText: {
		color: theme.colors.text,
		fontWeight: 'bold',
		fontSize: theme.typography.fontSize.base,
	},
	notification: {
		position: 'absolute',
		top: theme.spacing.xl,
		left: theme.spacing.xl,
		right: theme.spacing.xl,
		padding: theme.spacing.lg,
		borderRadius: theme.borderRadius.md,
		zIndex: 1000,
	},
	notificationText: {
		color: theme.colors.text,
		textAlign: 'center',
		fontWeight: 'bold',
	},
});
