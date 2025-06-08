import React, { useEffect, useState, useRef } from 'react';
import { View, Animated, Dimensions } from 'react-native';
import { Text, Button, useTheme, ActivityIndicator, Icon } from 'react-native-paper';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { BlurView } from 'expo-blur';
import { LoadingAnimation } from '../../Common/Animations';
import { TradeStatusModalProps } from './types';
import { createStyles } from './styles';
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const TradeStatusModal: React.FC<TradeStatusModalProps> = ({
	isVisible,
	onClose,
	onTryAgain,
	txHash,
	status,
	confirmations,
	error,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const bottomSheetModalRef = useRef<BottomSheetModal>(null);

	// State to prevent quick flashing between states
	const [displayStatus, setDisplayStatus] = useState(status);
	const [displayConfirmations, setDisplayConfirmations] = useState(confirmations);
	const [hasShownProgress, setHasShownProgress] = useState(false);
	
	// Flag to prevent double navigation when closing via button vs onDismiss
	const [isClosingProgrammatically, setIsClosingProgrammatically] = useState(false);

	// Animated values for smooth transitions
	const [fadeAnim] = useState(new Animated.Value(1));
	const [progressAnim] = useState(new Animated.Value(0));

	// Handle BottomSheetModal presentation
	useEffect(() => {
		if (isVisible) {
			setIsClosingProgrammatically(false);
			bottomSheetModalRef.current?.present();
		} else {
			bottomSheetModalRef.current?.dismiss();
		}
	}, [isVisible]);

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
						<ActivityIndicator size={12} color={theme.colors.primary} />
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
					<Text style={styles.confirmationsText}>
						{confirmationDisplay}
					</Text>
				</View>
				<View style={styles.progressBar}>
					<Animated.View
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
						{false && (
							<ActivityIndicator size={12} color={theme.colors.primary} />
						)}
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
						<Icon source="alert" size={16} color={theme.colors.onErrorContainer} />
					</View>
					<Text style={styles.errorTitle}>Error Details</Text>
				</View>
				<Text style={styles.errorText}>{error}</Text>
			</View>
		);
	};

	// Custom backdrop component with blur
	const renderBackdrop = (props: any) => {
		return (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				opacity={0.8}
				onPress={isFinal ? () => {
					setIsClosingProgrammatically(true);
					onClose();
				} : undefined} // Only allow tap-to-dismiss when final
			>
				<BlurView intensity={20} style={{ flex: 1 }} />
			</BottomSheetBackdrop>
		);
	};

	// Handle button close with programmatic flag
	const handleButtonClose = () => {
		setIsClosingProgrammatically(true);
		if (displayStatus === 'failed') {
			onTryAgain ? onTryAgain() : onClose();
		} else {
			onClose();
		}
	};

	// Handle onDismiss - only call onClose if not closing programmatically
	const handleDismiss = () => {
		if (!isClosingProgrammatically && isFinal) {
			onClose();
		}
		setIsClosingProgrammatically(false);
	};

	return (
		<BottomSheetModal
			ref={bottomSheetModalRef}
			snapPoints={[SCREEN_HEIGHT * 0.75]}
			onDismiss={handleDismiss}
			backgroundStyle={{ backgroundColor: theme.colors.surface }}
			handleIndicatorStyle={{ backgroundColor: theme.colors.onSurface }}
			enablePanDownToClose={isFinal}
			enableDismissOnClose={isFinal}
			backdropComponent={renderBackdrop}
		>
			<BottomSheetView style={{ flex: 1, padding: 20 }}>
				{/* Header */}
				<View style={styles.header}>
					<Text style={styles.title}>Transaction Status</Text>
				</View>

				{/* Status Section */}
				<Animated.View style={[styles.statusSection, { opacity: fadeAnim }]}>
					<View style={[styles.statusIconContainer, getStatusIconContainerStyle()]}>
						{getStatusIcon()}
					</View>
					<Text style={[styles.statusText, getStatusTextStyle()]}>
						{statusText}
					</Text>
					<Text style={styles.statusDescription}>
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
							mode="contained"
							onPress={handleButtonClose}
							style={styles.closeButton}
						>
							{displayStatus === 'failed' ? 'Try Again' : 'Done'}
						</Button>
					</View>
				)}
			</BottomSheetView>
		</BottomSheetModal>
	);
};

export default TradeStatusModal;

