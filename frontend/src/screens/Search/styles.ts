import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	safeArea: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	contentPadding: {
		padding: 16,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		gap: 12,
	},
	card: {
		padding: 16,
		borderRadius: 8,
		marginBottom: 12,
		backgroundColor: theme.colors.surfaceVariant,
	},
	searchCard: {
		marginBottom: 16,
		backgroundColor: theme.colors.surface,
	},
	searchInput: {
		height: 40,
		backgroundColor: theme.colors.surface,
		borderRadius: 8,
		paddingHorizontal: 12,
		color: theme.colors.onSurface,
	},
	flex1: {
		flex: 1,
	},
	listContent: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
	tokenItem: {
		flexDirection: 'row',
		padding: 16,
		alignItems: 'center',
		borderBottomWidth: 1,
		borderBottomColor: theme.colors.outlineVariant,
	},
	tokenImage: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 12,
	},
	tokenInfo: {
		flex: 1,
	},
	tokenDetails: {
		marginLeft: 12,
	},
	tokenNameRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 4,
	},
	tokenName: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	tokenSymbol: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		marginLeft: 8,
	},
	tokenMetrics: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	tokenPrice: {
		fontSize: 14,
		color: theme.colors.onSurface,
		marginRight: 12,
	},
	tokenVolume: {
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
	},
	priceChangePositive: {
		fontSize: 14,
		color: theme.colors.primary,
		marginLeft: 'auto',
	},
	priceChangeNegative: {
		fontSize: 14,
		color: theme.colors.error,
		marginLeft: 'auto',
	},
	errorContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 16,
	},
	errorText: {
		fontSize: 16,
		color: theme.colors.error,
		textAlign: 'center',
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 16,
	},
	emptyText: {
		fontSize: 16,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
		marginTop: 16,
	},
	filtersContainer: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 8,
		backgroundColor: theme.colors.surfaceVariant,
	},
	filterButton: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 16,
		backgroundColor: theme.colors.surface,
		marginRight: 8,
	},
	filterButtonActive: {
		backgroundColor: theme.colors.primary,
	},
	filterButtonText: {
		fontSize: 14,
		color: theme.colors.onSurface,
	},
	filterButtonTextActive: {
		color: theme.colors.onPrimary,
	},
}); 