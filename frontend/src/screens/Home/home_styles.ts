import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
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
		fontSize: 28,
		fontWeight: '700',
		color: theme.colors.onSurface,
		marginBottom: 4,
	},
	subtitleText: {
		fontSize: 16,
		color: theme.colors.onSurfaceVariant,
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
	},
	sectionTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},

	// Coins List
	coinsList: {
		paddingBottom: 100,
	},
	coinsSectionScrollView: {
		flex: 1,
	},
	loadingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20,
	},
	coinCardContainerStyle: {
		marginBottom: 12,
	},

	// Empty States
	emptyStateContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
	},
	emptyStateIcon: {
		marginBottom: 16,
		opacity: 0.6,
	},
	emptyStateTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: theme.colors.onSurface,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptyStateText: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
		lineHeight: 20,
	},

	// No Wallet State
	noWalletContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 40,
	},
	noWalletCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 20,
		padding: 32,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 4,
	},
	noWalletIcon: {
		marginBottom: 20,
		opacity: 0.7,
	},
	noWalletTitle: {
		fontSize: 20,
		fontWeight: '600',
		color: theme.colors.onSurface,
		marginBottom: 8,
		textAlign: 'center',
	},
	noWalletText: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
		lineHeight: 20,
		marginBottom: 24,
	},
	// The duplicate loadingContainer style definition has been removed.
	// The first definition of loadingContainer is kept:
	// loadingContainer: {
	//  flexDirection: 'row',
	//  alignItems: 'center',
	//  justifyContent: 'center',
	//  padding: 20,
	// },
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
