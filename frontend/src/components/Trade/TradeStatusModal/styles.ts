import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		backgroundColor: theme.colors.surface,
		padding: 20,
		margin: 16,
		borderRadius: 20,
		width: 360,
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
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
	},

	// Status Section
	statusSection: {
		alignItems: 'center',
		marginBottom: 20,
	},
	statusIconContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 12,
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
		fontSize: 16,
		fontWeight: '600',
		textAlign: 'center',
		marginBottom: 6,
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
		fontSize: 13,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
		lineHeight: 18,
	},

	// Progress Section - Always visible when in progress
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
		minHeight: 20,
	},
	progressLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: theme.colors.onSurfaceVariant,
		marginRight: 16,
	},
	confirmationsText: {
		fontSize: 13,
		fontWeight: '600',
		color: theme.colors.primary,
	},
	progressBar: {
		height: 8,
		backgroundColor: theme.colors.outline,
		borderRadius: 4,
		overflow: 'hidden',
	},
	progressFill: {
		height: '100%',
		backgroundColor: theme.colors.primary,
		borderRadius: 4,
	},

	// Animated progress indicator
	progressIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
	},
	progressDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: theme.colors.primary,
		marginRight: 4,
	},
	progressText: {
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
		marginLeft: 4,
	},

	// Transaction Details
	transactionSection: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		padding: 14,
		marginBottom: 16,
		width: '100%',
	},
	transactionHeader: {
		fontSize: 13,
		fontWeight: '600',
		color: theme.colors.onSurfaceVariant,
		marginBottom: 10,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	hashContainer: {
		backgroundColor: theme.colors.surface,
		borderRadius: 8,
		padding: 10,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: theme.colors.outline,
	},
	hashLabel: {
		fontSize: 11,
		color: theme.colors.onSurfaceVariant,
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	hashText: {
		fontSize: 13,
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
		padding: 14,
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
		fontSize: 13,
		fontWeight: '600',
		color: theme.colors.onErrorContainer,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	errorText: {
		fontSize: 13,
		color: theme.colors.onErrorContainer,
		lineHeight: 18,
	},

	// Actions
	actionSection: {
		width: '100%',
		marginTop: 4,
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
		fontSize: 15,
		color: theme.colors.onSurface,
		marginTop: 12,
		textAlign: 'center',
		fontWeight: '500',
	},
	loadingDescription: {
		fontSize: 13,
		color: theme.colors.onSurfaceVariant,
		marginTop: 6,
		textAlign: 'center',
		opacity: 0.8,
	},
});
