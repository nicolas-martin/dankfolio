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
		marginBottom: 32,
		paddingHorizontal: 20,
	},
	statusIconContainer: {
		alignItems: 'center',
		borderRadius: 40,
		height: 80,
		justifyContent: 'center',
		marginBottom: 20,
		width: 80,
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	statusIconLoading: {
		backgroundColor: theme.colors.surfaceVariant,
	},
	statusIconSuccess: {
		backgroundColor: '#4CAF50',
	},
	statusIconError: {
		backgroundColor: theme.colors.error,
	},
	statusIconWarning: {
		backgroundColor: '#FF9800',
	},
	statusText: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 8,
		textAlign: 'center',
	},
	statusTextLoading: {
		color: theme.colors.onSurface,
	},
	statusTextSuccess: {
		color: '#4CAF50',
	},
	statusTextError: {
		color: theme.colors.error,
	},
	statusTextWarning: {
		color: '#FF9800',
	},
	statusDescription: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
		opacity: 0.8,
	},

	// Progress Section - Always visible when in progress
	progressSection: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginBottom: 24,
		padding: 20,
		width: '100%',
		borderWidth: 1,
		borderColor: theme.colors.outline,
	},
	progressHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
		minHeight: 20,
	},
	progressLabel: {
		color: theme.colors.onSurface,
		fontSize: 14,
		fontWeight: '600',
		marginRight: 16,
	},
	confirmationsText: {
		// color: '#4CAF50',
		fontSize: 14,
		fontWeight: '700',
		// backgroundColor: '#E8F5E8',
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
		overflow: 'hidden',
	},
	progressBar: {
		backgroundColor: '#E0E0E0',
		borderRadius: 6,
		height: 12,
		overflow: 'hidden',
	},
	progressFill: {
		backgroundColor: '#4CAF50',
		borderRadius: 6,
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
		marginBottom: 24,
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
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#2196F3',
		backgroundColor: 'transparent',
		marginHorizontal: 0,
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
		marginTop: 8,
		width: '100%',
	},
	closeButton: {
		borderRadius: 16,
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		backgroundColor: '#4CAF50',
		paddingVertical: 8,
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
