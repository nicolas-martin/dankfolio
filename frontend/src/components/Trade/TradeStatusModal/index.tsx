import React from 'react';
import { View, Animated } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, ActivityIndicator, Icon } from 'react-native-paper';
import { TradeStatusModalProps } from './types';
import { createStyles } from './styles';
import { openSolscanUrl } from '@/utils/url';
import {
	getStatusText,
	getStatusDescription,
	getStatusType,
	isFinalStatus,
	isInProgressStatus,
	formatTxHash,
	getConfirmationProgress,
	formatConfirmationsText,
} from './scripts';

const TradeStatusModal: React.FC<TradeStatusModalProps> = ({
	isVisible,
	onClose,
	txHash,
	status,
	confirmations,
	error,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const statusType = getStatusType(status);
	const statusText = getStatusText(status);
	const statusDescription = getStatusDescription(status);
	const isFinal = isFinalStatus(status);
	const isInProgress = isInProgressStatus(status);

	const getStatusIcon = () => {
		switch (statusType) {
			case 'success':
				return <Icon source="check-circle" size={32} color="#2E7D32" />;
			case 'error':
				return <Icon source="alert-circle" size={32} color={theme.colors.error} />;
			case 'warning':
				return <Icon source="clock" size={32} color="#F57C00" />;
			default:
				return <ActivityIndicator size={32} color={theme.colors.primary} />;
		}
	};

	const getStatusIconContainerStyle = () => {
		switch (statusType) {
			case 'success':
				return styles.statusIconSuccess;
			case 'error':
				return styles.statusIconError;
			case 'warning':
				return styles.statusIconWarning;
			default:
				return styles.statusIconLoading;
		}
	};

	const getStatusTextStyle = () => {
		switch (statusType) {
			case 'success':
				return styles.statusTextSuccess;
			case 'error':
				return styles.statusTextError;
			case 'warning':
				return styles.statusTextWarning;
			default:
				return styles.statusTextLoading;
		}
	};

	const renderProgressSection = () => {
		if (!isInProgress || !txHash) return null;

		const progress = getConfirmationProgress(confirmations);

		return (
			<View style={styles.progressSection}>
				<View style={styles.progressHeader}>
					<Text style={styles.progressLabel}>Network Confirmations</Text>
					<Text style={styles.confirmationsText}>
						{formatConfirmationsText(confirmations)}
					</Text>
				</View>
				<View style={styles.progressBar}>
					<View style={[styles.progressFill, { width: `${progress}%` }]} />
				</View>
			</View>
		);
	};

	const renderTransactionSection = () => {
		if (!txHash) return null;

		return (
			<View style={styles.transactionSection}>
				<Text style={styles.transactionHeader}>Transaction Details</Text>
				<View style={styles.hashContainer}>
					<Text style={styles.hashLabel}>Transaction Hash</Text>
					<Text style={styles.hashText} selectable>
						{formatTxHash(txHash)}
					</Text>
				</View>
				<Button
					icon="open-in-new"
					mode="outlined"
					onPress={() => openSolscanUrl(txHash)}
					style={styles.linkButton}
				>
					View on Solscan
				</Button>
			</View>
		);
	};

	const renderErrorSection = () => {
		if (status !== 'failed' || !error) return null;

		return (
			<View style={styles.errorSection}>
				<View style={styles.errorHeader}>
					<View style={styles.errorIcon}>
						<Icon source="alert" size={16} color={theme.colors.onErrorContainer} />
					</View>
					<Text style={styles.errorTitle}>Error Details</Text>
				</View>
				<Text style={styles.errorText}>{error}</Text>
			</View>
		);
	};

	// Loading state for initial submission
	if (status === 'pending' && !txHash) {
		return (
			<Portal>
				<Modal
					visible={isVisible}
					onDismiss={isFinal ? onClose : undefined}
					contentContainerStyle={styles.container}
					dismissable={isFinal}
				>
					<View style={styles.header}>
						<Text style={styles.title}>Transaction Status</Text>
						<Text style={styles.subtitle}>Processing your request</Text>
					</View>
					
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={theme.colors.primary} />
						<Text style={styles.loadingText}>{statusText}</Text>
						<Text style={styles.loadingDescription}>{statusDescription}</Text>
					</View>
				</Modal>
			</Portal>
		);
	}

	return (
		<Portal>
			<Modal
				visible={isVisible}
				onDismiss={isFinal ? onClose : undefined}
				contentContainerStyle={styles.container}
				dismissable={isFinal}
			>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Transaction Status</Text>
					<Text style={styles.subtitle}>Track your transaction progress</Text>
				</View>

				{/* Status Section */}
				<View style={styles.statusSection}>
					<View style={[styles.statusIconContainer, getStatusIconContainerStyle()]}>
						{getStatusIcon()}
					</View>
					<Text style={[styles.statusText, getStatusTextStyle()]}>
						{statusText}
					</Text>
					<Text style={styles.statusDescription}>
						{statusDescription}
					</Text>
				</View>

				{/* Progress Section */}
				{renderProgressSection()}

				{/* Transaction Details */}
				{renderTransactionSection()}

				{/* Error Section */}
				{renderErrorSection()}

				{/* Action Button */}
				{isFinal && (
					<View style={styles.actionSection}>
						<Button
							mode="contained"
							onPress={onClose}
							style={styles.closeButton}
						>
							{status === 'failed' ? 'Try Again' : 'Done'}
						</Button>
					</View>
				)}
			</Modal>
		</Portal>
	);
};

export default TradeStatusModal;