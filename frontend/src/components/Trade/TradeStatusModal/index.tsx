import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react'; // Added useMemo, useCallback
import { View, Animated } from 'react-native'; // Removed Dimensions
import { Text, Button, ActivityIndicator, Icon } from 'react-native-paper';
// BottomSheetModal, BottomSheetView, BottomSheetBackdrop will be handled by ManagedBottomSheetModal
import { LoadingAnimation } from '../../Common/Animations';
import { TradeStatusModalProps } from './types';
import ManagedBottomSheetModal from '@/components/Common/BottomSheet/ManagedBottomSheetModal'; // Import new modal
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

	// Handle BottomSheetModal presentation
	useEffect(() => {
		logger.info(`[TradeStatusModal] useEffect for isVisible triggered. isVisible: ${isVisible}, txHash: ${txHash}, bottomSheetModalRef.current: ${bottomSheetModalRef.current}`);
		if (isVisible) {
			logger.info(`[TradeStatusModal] useEffect: isVisible is true, attempting to present. txHash: ${txHash}`);
			bottomSheetModalRef.current?.present();
		} else {
			logger.info(`[TradeStatusModal] useEffect: isVisible is false, attempting to dismiss.`);
			bottomSheetModalRef.current?.dismiss();
		}
	}, [isVisible, txHash]); // Added txHash to dependencies for logging completeness

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
		if (txHash && (isInProgressStatus(displayStatus) || displayStatus === 'finalized')) {
			let progress;
			if (displayStatus === 'finalized') {
				// Always show 100% for finalized transactions
				progress = 100;
			} else {
				progress = getConfirmationProgress(displayConfirmations);
			}

			Animated.timing(progressAnim, {
				toValue: progress / 100,
				duration: displayStatus === 'finalized' ? 500 : 300, // Slightly longer animation for completion
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
		// Show progress if currently in progress OR if we've shown it before and not failed OR if finalized
		const shouldShowProgress = isInProgress || (hasShownProgress && displayStatus !== 'failed') || displayStatus === 'finalized';

		if (!shouldShowProgress) return null;

		// For pending state without txHash, show preparing message
		if (displayStatus === 'pending' && !txHash) {
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
		const confirmationDisplay = displayStatus === 'finalized'
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
						style={[
							styles.progressFill,
							{
								width: progressAnim.interpolate({
									inputRange: [0, 1],
									outputRange: ['0%', '100%'],
								})
							}
						]}
					/>
				</View>
				{isInProgress && (
					<View style={styles.progressIndicator}>
						{/* false && <ActivityIndicator size={12} color={theme.colors.primary} /> Removed */}
						<Text style={styles.progressText}>
							{displayStatus === 'polling' ? 'Confirming...' : 'Processing...'}
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
					mode="outlined"
					onPress={() => openSolscanUrl(txHash)}
					style={styles.linkButton}
					textColor="#2196F3"
					testID="trade-status-solscan-button"
					accessible={true}
					accessibilityRole="button"
					accessibilityLabel="View transaction on Solscan"
				>
					View on Solscan
				</Button>
			</View>
		);
	};

	const renderErrorSection = () => {
		if (displayStatus !== 'failed' || !error) return null;

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
	const handleButtonClose = () => {
			onClose();
	};

	const snapPoints = useMemo(() => ['75%'], []);


	return (
		<ManagedBottomSheetModal
			isVisible={isVisible}
			onClose={onClose}
			snapPoints={snapPoints}
			// Pass isFinal to enablePanDownToClose, ManagedBottomSheetModal needs to support this
			bottomSheetModalProps={{
				enablePanDownToClose: isFinal,
				// enableDismissOnClose: isFinal, // enablePanDownToClose often covers this
			}}
		>
			{/* Header */}
			<View style={styles.header}>
				<Text style={styles.title}>Transaction Status</Text>
			</View>

			{/* Status Section */}
			<Animated.View style={[styles.statusSection, { opacity: fadeAnim }]}>
				<View testID="trade-status-icon" style={[styles.statusIconContainer, getStatusIconContainerStyle()]}>
					{getStatusIcon()}
				</View>
				<Text testID="trade-status-text" style={[styles.statusText, getStatusTextStyle()]}>
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
					<Button
						testID="trade-status-action-button"
						mode="contained"
						onPress={handleButtonClose}
						style={styles.closeButton}
						accessible={true}
						accessibilityRole="button"
						accessibilityLabel={displayStatus === 'failed' ? 'Try again' : 'Close modal'}
					>
						{displayStatus === 'failed' ? 'Try Again' : 'Done'}
					</Button>
				</View>
			)}
		</ManagedBottomSheetModal>
	);
};

export default TradeStatusModal;

