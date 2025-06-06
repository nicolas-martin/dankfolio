import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	card: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 8,
		marginBottom: 12,
		padding: 16,
	},
	container: {
		backgroundColor: theme.colors.background,
		flex: 1,
	},
	contentPadding: {
		padding: 16,
	},
	emptyContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		padding: 16,
	},
	emptyText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
		marginTop: 16,
		textAlign: 'center',
	},
	errorContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		padding: 16,
	},
	errorText: {
		color: theme.colors.error,
		fontSize: 16,
		textAlign: 'center',
	},
	filterButton: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginRight: 8,
		paddingHorizontal: 12,
		paddingVertical: 6,
	},
	filterButtonActive: {
		backgroundColor: theme.colors.primary,
	},
	filterButtonText: {
		color: theme.colors.onSurface,
		fontSize: 14,
	},
	filterButtonTextActive: {
		color: theme.colors.onPrimary,
	},
	filtersContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		flexDirection: 'row',
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	flex1: {
		flex: 1,
	},
	headerRow: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 12,
		marginBottom: 16,
	},
	listContent: {
		paddingBottom: 16,
		paddingHorizontal: 16,
	},
	loadingContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
	},
	priceChangeNegative: {
		color: theme.colors.error,
		fontSize: 14,
		marginLeft: 'auto',
	},
	priceChangePositive: {
		color: theme.colors.primary,
		fontSize: 14,
		marginLeft: 'auto',
	},
	safeArea: {
		backgroundColor: theme.colors.background,
		flex: 1,
	},
	searchCard: {
		backgroundColor: theme.colors.surface,
		marginBottom: 16,
	},
	searchInput: {
		backgroundColor: theme.colors.surface,
		borderRadius: 8,
		color: theme.colors.onSurface,
		height: 40,
		paddingHorizontal: 12,
	},
	sortButton: {
		alignItems: 'center',
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 4,
		justifyContent: 'center', 
		paddingHorizontal: 12,
		paddingVertical: 8,
	},
	sortButtonText: {
		color: theme.colors.onSurfaceVariant, 
		fontSize: 12,
		fontWeight: '500',
	},
	sortButtonsContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		paddingVertical: 8,
		// paddingHorizontal: 16, // Already in contentPadding
	},
	tokenDetails: {
		marginLeft: 12,
	},
	tokenImage: {
		borderRadius: 20,
		height: 40,
		marginRight: 12,
		width: 40,
	},
	tokenInfo: {
		flex: 1,
	},
	tokenItem: {
		alignItems: 'center',
		borderBottomColor: theme.colors.outlineVariant,
		borderBottomWidth: 1,
		flexDirection: 'row',
		padding: 16,
	},
	tokenMetrics: {
		alignItems: 'center',
		flexDirection: 'row',
	},
	tokenName: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	tokenNameRow: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 4,
	},
	tokenPrice: {
		color: theme.colors.onSurface,
		fontSize: 14,
		marginRight: 12,
	},
	tokenSymbol: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		marginLeft: 8,
	},
	tokenVolume: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},
}); 
