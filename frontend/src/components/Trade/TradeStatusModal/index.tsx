import React from 'react';
import { View } from 'react-native';
import { Modal, Portal, Text, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { TradeStatusModalProps, PollingStatus } from './types';
import { createStyles } from './styles';
import { openSolscanUrl } from '@/utils/url'; // Import the utility function

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

	const getStatusText = (currentStatus: PollingStatus): string => {
		switch (currentStatus) {
			case 'pending':
				return 'Submitting Transaction...';
			case 'polling':
				return 'Waiting for Confirmation...';
			case 'confirmed':
				return 'Transaction Confirmed!';
			case 'finalized':
				return 'Transaction Finalized!';
			case 'failed':
				return 'Transaction Failed';
			default:
				return 'Checking Status...';
		}
	};

	const getStatusColor = (currentStatus: PollingStatus): string => {
		switch (currentStatus) {
			case 'confirmed':
			case 'finalized':
				return theme.colors.primary; // Or a success color if defined
			case 'failed':
				return theme.colors.error;
			default:
				return theme.colors.onSurface;
		}
	};

	const statusText = getStatusText(status);
	const statusColor = getStatusColor(status);

	return (
		<Portal>
			<Modal
				visible={isVisible}
				onDismiss={onClose} // Allow closing by tapping outside, or handle based on status
				contentContainerStyle={styles.container}
				dismissable={status === 'finalized' || status === 'failed'} // Only allow dismiss when polling is done
			>
				<Text style={styles.title}>Transaction Status</Text>

				{status === 'pending' || (status === 'polling' && !txHash) ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator animating={true} size="large" />
						<Text style={[styles.statusText, { marginTop: 15 }]}>{statusText}</Text>
					</View>
				) : (
					<>
						<View style={styles.statusContainer}>
							<ActivityIndicator animating={status !== 'finalized' && status !== 'failed'} size="small" />
							<Text style={[styles.statusText, { color: statusColor, marginTop: status === 'polling' ? 5 : 0 }]}>
								{statusText}
							</Text>
							{(status === 'polling' || status === 'confirmed') && (
								<Text style={styles.confirmationsText}>
									Confirmations: {confirmations}
								</Text>
							)}
						</View>

						{txHash && (
							<>
								<Text style={styles.hashText} selectable>
									Tx Hash: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 10)}
								</Text>
								<Button
									icon="open-in-new"
									mode="outlined"
									onPress={() => openSolscanUrl(txHash)}
									style={styles.linkButton}
								>
									View on Solscan
								</Button>
							</>
						)}

						{status === 'failed' && error && (
							<Text style={styles.errorText}>Error: {error}</Text>
						)}

						{(status === 'finalized' || status === 'failed') && (
							<Button
								mode="contained"
								onPress={onClose}
								style={styles.closeButton}
							>
								Close
							</Button>
						)}
					</>
				)}
			</Modal>
		</Portal>
	);
};

export default TradeStatusModal;