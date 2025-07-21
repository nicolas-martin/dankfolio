import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Animated } from 'react-native';
import { Text, Button, ActivityIndicator, Icon } from 'react-native-paper';
import { LoadingAnimation } from '@components/Common/Animations';
import { TradeStatusModalProps, PollingStatus } from './types';
import ManagedBottomSheetModal from '@/components/Common/BottomSheet';
import ModalActionButtons from '@/components/Common/ModalActionButton';
import { useStyles } from './styles';
import { openSolscanUrl } from '@/utils/url';
import {
	getStatusText,
	getStatusDescription,
	getStatusType,
	isFinalStatus,
	isInProgressStatus,
	getConfirmationProgress,
	formatConfirmationsText,
} from './scripts';
import { logger } from '@/utils/logger';

// const { height: SCREEN_HEIGHT } = Dimensions.get('window'); // No longer directly needed here for snapPoints

const TradeStatusModal: React.FC<TradeStatusModalProps> = ({
	isVisible,
	onClose,
	txHash,
	status,
	confirmations,
	error,
}) => {
	// Log props at the beginning of the component
	logger.info(`[TradeStatusModal] Render with props:`, { isVisible, txHash, status, confirmations, error });

	const styles = useStyles();
	// bottomSheetModalRef and its useEffect are now handled by ManagedBottomSheetModal

	// State to prevent quick flashing between states
	const [displayStatus, setDisplayStatus] = useState(status);
	const [displayConfirmations, setDisplayConfirmations] = useState(confirmations);
	const [hasShownProgress, setHasShownProgress] = useState(false);

	// Animated values for smooth transitions
	const [fadeAnim] = useState(new Animated.Value(1));
	const [progressAnim] = useState(new Animated.Value(0));

	// Update display status with smooth transitions
	useEffect(() => {
		if (status !== displayStatus) {
			// Fade out, update, fade in
			Animated.sequence([
				Animated.timing(fadeAnim, {
					toValue: 0.7,
					duration: 150,
					useNativeDriver: true,
				}),
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 150,
					useNativeDriver: true,
				}),
			]).start();

			setDisplayStatus(status);
		}
	}, [status, displayStatus, fadeAnim]);

	// Update confirmations smoothly
	useEffect(() => {
		if (confirmations !== displayConfirmations) {
			setDisplayConfirmations(confirmations);
		}
	}, [confirmations, displayConfirmations]);

	// Track if we've shown progress to keep it visible
	useEffect(() => {
		if (isInProgressStatus(status) && txHash) {
			setHasShownProgress(true);
		}
	}, [status, txHash]);

	// Animate progress bar
	useEffect(() => {
		if (txHash && (isInProgressStatus(displayStatus) || displayStatus === PollingStatus.FINALIZED)) {
			let progress;
			if (displayStatus === PollingStatus.FINALIZED) {
				// Always show 100% for finalized transactions
				progress = 100;
			} else {
				progress = getConfirmationProgress(displayConfirmations);
			}

			Animated.timing(progressAnim, {
				toValue: progress / 100,
				duration: displayStatus === PollingStatus.FINALIZED ? 500 : 300, // Slightly longer animation for completion
				useNativeDriver: false,
			}).start();
		}
	}, [displayConfirmations, displayStatus, txHash, progressAnim]);

	const statusType = getStatusType(displayStatus);
	const statusText = getStatusText(displayStatus);
	const statusDescription = getStatusDescription(displayStatus);
	const isFinal = isFinalStatus(displayStatus);
	const isInProgress = isInProgressStatus(displayStatus);

	const getStatusIcon = () => {
		switch (statusType) {
			case 'success':
				return <Icon source="check" size={32} color="#FFFFFF" />;
			case 'error':
				return <Icon source="close" size={32} color="#FFFFFF" />;
			case 'warning':
				return <Icon source="clock" size={32} color="#FFFFFF" />;
			default: // Corresponds to loading/processing
				return <LoadingAnimation size={36} />;
		}
	};

	const getStatusIconContainerStyle = useCallback(() => {
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
	}, [statusType, styles.statusIconSuccess, styles.statusIconError, styles.statusIconWarning, styles.statusIconLoading]);

	const getStatusTextStyle = useCallback(() => {
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
	}, [statusType, styles.statusTextSuccess, styles.statusTextError, styles.statusTextWarning, styles.statusTextLoading]);

	// All hooks must be at top level before any render functions

	const renderProgressSection = () => {
		// Show progress if currently in progress OR if we've shown it before and not failed OR if finalized
		const shouldShowProgress = isInProgress || (hasShownProgress && displayStatus !== PollingStatus.FAILED) || displayStatus === PollingStatus.FINALIZED;

		if (!shouldShowProgress) return null;

		// For pending state without txHash, show preparing message
		if (displayStatus === PollingStatus.PENDING && !txHash) {
			return (
				<View style={styles.progressSection}>
					<View style={styles.progressIndicator}>
						<ActivityIndicator size={12} color={styles.colors.primary} />
						<Text style={styles.progressText}>Preparing transaction...</Text>
					</View>
				</View>
			);
		}

		// For finalized transactions, show "Complete" instead of confirmation count
		const confirmationDisplay = displayStatus === PollingStatus.FINALIZED
			? 'Complete'
			: formatConfirmationsText(displayConfirmations);

		return (
			<View style={styles.progressSection}>
				<View style={styles.progressHeader}>
					<Text style={styles.progressLabel}>Network Confirmations</Text>
					<Text testID="trade-status-confirmations-text" style={styles.confirmationsText}>
						{confirmationDisplay}
					</Text>
				</View>
				<View style={styles.progressBar}>
					<Animated.View
						testID="trade-status-progress-bar"
						style={styles.createProgressFillStyle(progressAnim)}
					/>
				</View>
				{isInProgress && (
					<View style={styles.progressIndicator}>
						<Text style={styles.progressText}>
							{displayStatus === PollingStatus.POLLING ? 'Confirming...' : 'Processing...'}
						</Text>
					</View>
				)}
			</View>
		);
	};

	const renderTransactionSection = () => {
		if (!txHash) return null;

		return (
			<View style={styles.transactionSection}>
				<Button
					icon="open-in-new"
					mode="contained"
					onPress={() => openSolscanUrl(txHash)}
					style={styles.linkButton}
					buttonColor={styles.colors.primaryContainer}
					textColor={styles.colors.onPrimaryContainer}
					testID="trade-status-solscan-button"
					accessible={true}
					accessibilityRole="button"
					accessibilityLabel="View transaction on Solscan"
				>
					<Text>View on Solscan</Text>
				</Button>
			</View>
		);
	};

	const renderErrorSection = () => {
		if (displayStatus !== PollingStatus.FAILED || !error) return null;

		return (
			<View style={styles.errorSection}>
				<View style={styles.errorHeader}>
					<View style={styles.errorIcon}>
						<Icon source="alert" size={16} color={styles.colors.onErrorContainer} />
					</View>
					<Text style={styles.errorTitle}>Error Details</Text>
				</View>
				<Text testID="trade-status-error-message" style={styles.errorText}>{error}</Text>
			</View>
		);
	};

	// renderBackdrop is now handled by ManagedBottomSheetModal by default.
	// If custom backdrop logic (like conditional onPress) is strictly needed,
	// ManagedBottomSheetModal would need to accept a renderBackdrop prop.
	// For this refactor, we assume the standard backdrop is sufficient or onClose logic is handled by button.

	// Handle button close with programmatic flag
	const handleButtonClose = useCallback(() => {
		logger.info('[TradeStatusModal] Button close pressed');
		onClose();
	}, [onClose]);

	const snapPoints = useMemo(() => ['75%'], []);

	const memoizedBottomSheetProps = useMemo(() => ({
		enablePanDownToClose: isFinal,
		enableHandlePanningGesture: isFinal,
		enableContentPanningGesture: false,
	}), [isFinal]);

	const statusSectionStyle = useMemo(() => [
		styles.statusSection,
		{ opacity: fadeAnim }
	], [styles.statusSection, fadeAnim]);

	const iconContainerStyleToApply = useMemo(() => [
		styles.statusIconContainer,
		getStatusIconContainerStyle()
	], [styles.statusIconContainer, getStatusIconContainerStyle]); // getStatusIconContainerStyle() depends on displayStatus

	const textStyleToApply = useMemo(() => [
		styles.statusText,
		getStatusTextStyle()
	], [styles.statusText, getStatusTextStyle]); // getStatusTextStyle() depends on displayStatus

	return (
		<ManagedBottomSheetModal
			isVisible={isVisible}
			onClose={onClose}
			snapPoints={snapPoints}
			enableBackdropPress={isFinal}
			bottomSheetModalProps={memoizedBottomSheetProps}
		>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>Transaction Status</Text>
			</View>

			{/* Status Section */}
			<Animated.View style={statusSectionStyle}>
				<View testID="trade-status-icon" style={iconContainerStyleToApply}>
					{getStatusIcon()}
				</View>
				<Text testID="trade-status-text" style={textStyleToApply}>
					{statusText}
				</Text>
				<Text testID="trade-status-description" style={styles.statusDescription}>
					{statusDescription}
				</Text>
			</Animated.View>

			{/* Progress Section */}
			{renderProgressSection()}

			{/* Transaction Details */}
			{renderTransactionSection()}

			{/* Error Section */}
			{renderErrorSection()}

			{/* Action Button */}
			{isFinal && (
				<View style={styles.actionSection}>
					<ModalActionButtons
						primaryButtonText={displayStatus === PollingStatus.FAILED ? 'Try Again' : 'Done'}
						onPrimaryButtonPress={handleButtonClose}
						primaryButtonTestID="trade-status-action-button"
					/>
				</View>
			)}
		</ManagedBottomSheetModal>
	);
};

export default TradeStatusModal;

