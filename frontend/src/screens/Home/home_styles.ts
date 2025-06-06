import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		backgroundColor: theme.colors.background,
		flex: 1,
	},
	content: {
		flex: 1,
	},

	// Header Section
	headerContainer: {
		padding: 20,
		paddingBottom: 16,
	},
	welcomeText: {
		color: theme.colors.onSurface,
		fontSize: 28,
		fontWeight: '700',
		marginBottom: 4,
	},
	subtitleText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
		fontWeight: '400',
	},

	// Coins Section
	coinsSection: {
		flex: 1,
		paddingHorizontal: 20,
		paddingTop: 20,
	},
	sectionHeader: {
		marginBottom: 16,
		paddingHorizontal: 16,
	},
	sectionTitle: {
		color: theme.colors.onSurface,
		fontSize: 20,
		fontWeight: '600',
	},

	// Coins List
	coinsList: {
		paddingBottom: 100,
	},
	coinsSectionScrollView: {
		flex: 1,
	},
	loadingContainer: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'center',
		padding: 20,
	},
	coinCardContainerStyle: {
		marginBottom: 12,
		paddingHorizontal: 16,
	},

	// Empty States
	emptyStateContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 40,
	},
	emptyStateIcon: {
		marginBottom: 16,
		opacity: 0.6,
	},
	emptyStateTitle: {
		color: theme.colors.onSurface,
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	emptyStateText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
	},

	// No Wallet State
	noWalletContainer: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 40,
	},
	noWalletCard: {
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 20,
		elevation: 4,
		padding: 32,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	noWalletIcon: {
		marginBottom: 20,
		opacity: 0.7,
	},
	noWalletTitle: {
		color: theme.colors.onSurface,
		fontSize: 20,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center',
	},
	noWalletText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 24,
		textAlign: 'center',
	},
	connectButton: {
		backgroundColor: theme.colors.primary,
		borderRadius: 12,
		paddingHorizontal: 24,
		paddingVertical: 12,
	},
	connectButtonText: {
		color: theme.colors.onPrimary,
		fontSize: 16,
		fontWeight: '600',
	},
});
