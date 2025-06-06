import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		alignSelf: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 20,
		elevation: 8,
		margin: 16,
		maxWidth: 400,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		width: 360,
	},

	// Header
	header: {
		alignItems: 'center',
		marginBottom: 24,
	},
	title: {
		color: theme.colors.onSurface,
		fontSize: 22,
		fontWeight: '700',
		marginBottom: 6,
		textAlign: 'center',
	},
	subtitle: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		textAlign: 'center',
	},

	// Status Section
	statusSection: {
		alignItems: 'center',
		marginBottom: 20,
	},
	statusIconContainer: {
		alignItems: 'center',
		borderRadius: 28,
		height: 56,
		justifyContent: 'center',
		marginBottom: 12,
		width: 56,
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
		marginBottom: 6,
		textAlign: 'center',
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
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		lineHeight: 18,
		textAlign: 'center',
	},

	// Progress Section - Always visible when in progress
	progressSection: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		marginBottom: 16,
		padding: 16,
		width: '100%',
	},
	progressHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
		minHeight: 20,
	},
	progressLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: '600',
		marginRight: 16,
	},
	confirmationsText: {
		color: theme.colors.primary,
		fontSize: 13,
		fontWeight: '600',
	},
	progressBar: {
		backgroundColor: theme.colors.outline,
		borderRadius: 4,
		height: 8,
		overflow: 'hidden',
	},
	progressFill: {
		backgroundColor: theme.colors.primary,
		borderRadius: 4,
		height: '100%',
	},

	// Animated progress indicator
	progressIndicator: {
		alignItems: 'center',
		flexDirection: 'row',
		marginTop: 8,
	},
	progressDot: {
		backgroundColor: theme.colors.primary,
		borderRadius: 3,
		height: 6,
		marginRight: 4,
		width: 6,
	},
	progressText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
		marginLeft: 4,
	},

	// Transaction Details
	transactionSection: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		marginBottom: 16,
		padding: 14,
		width: '100%',
	},
	transactionHeader: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: '600',
		letterSpacing: 0.5,
		marginBottom: 10,
		textTransform: 'uppercase',
	},
	hashContainer: {
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.outline,
		borderRadius: 8,
		borderWidth: 1,
		marginBottom: 10,
		padding: 10,
	},
	hashLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 11,
		letterSpacing: 0.5,
		marginBottom: 4,
		textTransform: 'uppercase',
	},
	hashText: {
		color: theme.colors.onSurface,
		fontFamily: 'monospace',
		fontSize: 13,
		fontWeight: '500',
	},
	linkButton: {
		borderRadius: 8,
	},

	// Error Section
	errorSection: {
		backgroundColor: theme.colors.errorContainer,
		borderRadius: 12,
		marginBottom: 16,
		padding: 14,
		width: '100%',
	},
	errorHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 8,
	},
	errorIcon: {
		marginRight: 8,
	},
	errorTitle: {
		color: theme.colors.onErrorContainer,
		fontSize: 13,
		fontWeight: '600',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	errorText: {
		color: theme.colors.onErrorContainer,
		fontSize: 13,
		lineHeight: 18,
	},

	// Actions
	actionSection: {
		marginTop: 4,
		width: '100%',
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
		color: theme.colors.onSurface,
		fontSize: 15,
		fontWeight: '500',
		marginTop: 12,
		textAlign: 'center',
	},
	loadingDescription: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		marginTop: 6,
		opacity: 0.8,
		textAlign: 'center',
	},
});
