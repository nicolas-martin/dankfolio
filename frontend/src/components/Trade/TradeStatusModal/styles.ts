import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		backgroundColor: theme.colors.surface,
		padding: 24,
		margin: 16,
		borderRadius: 16,
		maxWidth: 400,
		alignSelf: 'center',
		elevation: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
	},

	// Header
	header: {
		alignItems: 'center',
		marginBottom: 24,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		color: theme.colors.onSurface,
		textAlign: 'center',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
	},

	// Status Section
	statusSection: {
		alignItems: 'center',
		marginBottom: 24,
	},
	statusIconContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16,
	},
	statusIconLoading: {
		backgroundColor: theme.colors.surfaceVariant,
	},
	statusIconSuccess: {
		backgroundColor: '#E8F5E8',
	},
	statusIconError: {
		backgroundColor: theme.colors.errorContainer,
	},
	statusIconWarning: {
		backgroundColor: '#FFF3E0',
	},
	statusText: {
		fontSize: 18,
		fontWeight: '600',
		textAlign: 'center',
		marginBottom: 8,
	},
	statusTextLoading: {
		color: theme.colors.onSurface,
	},
	statusTextSuccess: {
		color: '#2E7D32',
	},
	statusTextError: {
		color: theme.colors.error,
	},
	statusTextWarning: {
		color: '#F57C00',
	},
	statusDescription: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
		lineHeight: 20,
	},

	// Progress Section
	progressSection: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		width: '100%',
	},
	progressHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	progressLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: theme.colors.onSurfaceVariant,
	},
	confirmationsText: {
		fontSize: 14,
		fontWeight: '600',
		color: theme.colors.primary,
	},
	progressBar: {
		height: 6,
		backgroundColor: theme.colors.outline,
		borderRadius: 3,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		backgroundColor: theme.colors.primary,
		borderRadius: 3,
	},

	// Transaction Details
	transactionSection: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		width: '100%',
	},
	transactionHeader: {
		fontSize: 14,
		fontWeight: '600',
		color: theme.colors.onSurfaceVariant,
		marginBottom: 12,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	hashContainer: {
		backgroundColor: theme.colors.surface,
		borderRadius: 8,
		padding: 12,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: theme.colors.outline,
	},
	hashLabel: {
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	hashText: {
		fontSize: 14,
		fontFamily: 'monospace',
		color: theme.colors.onSurface,
		fontWeight: '500',
	},
	linkButton: {
		borderRadius: 8,
	},

	// Error Section
	errorSection: {
		backgroundColor: theme.colors.errorContainer,
		borderRadius: 12,
		padding: 16,
		marginBottom: 16,
		width: '100%',
	},
	errorHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	errorIcon: {
		marginRight: 8,
	},
	errorTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: theme.colors.onErrorContainer,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	errorText: {
		fontSize: 14,
		color: theme.colors.onErrorContainer,
		lineHeight: 20,
	},

	// Actions
	actionSection: {
		width: '100%',
		marginTop: 8,
	},
	closeButton: {
		borderRadius: 12,
		elevation: 2,
		shadowColor: theme.colors.primary,
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.2,
		shadowRadius: 4,
	},

	// Loading State
	loadingContainer: {
		alignItems: 'center',
		paddingVertical: 32,
	},
	loadingText: {
		fontSize: 16,
		color: theme.colors.onSurfaceVariant,
		marginTop: 16,
		textAlign: 'center',
	},
	loadingDescription: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		marginTop: 8,
		textAlign: 'center',
		opacity: 0.8,
	},
});