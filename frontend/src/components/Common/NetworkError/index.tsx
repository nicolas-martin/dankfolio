import React from 'react';
import { View, Modal, TouchableOpacity } from 'react-native';
import { Text, Icon } from 'react-native-paper';
import { useNetwork } from '@/contexts/NetworkContext';
import { logger } from '@/utils/logger';
import { useStyles } from './styles';

interface NetworkErrorProps {
	visible?: boolean;
	onRetry?: () => void;
	showRetryButton?: boolean;
	allowDismiss?: boolean;
}

const NetworkError: React.FC<NetworkErrorProps> = ({
	visible,
	onRetry,
	showRetryButton = true,
	allowDismiss = false
}) => {
	const styles = useStyles();
	const { statusMessage, refreshNetworkState, simulateOnline, isTestMode } = useNetwork();

	const handleRetry = async () => {
		logger.breadcrumb({ category: 'network', message: 'User manually retried network connection' });
		await refreshNetworkState();
		onRetry?.();
	};

	return (
		<Modal
			visible={visible ?? true}
			transparent
			animationType="fade"
			statusBarTranslucent
		>
			<View style={styles.overlay}>
				<View style={styles.container}>
					<View style={styles.content}>
						<View style={styles.iconContainer}>
							<Icon source="wifi-off" size={64} color={styles.colors.error} />
						</View>

						<Text style={styles.title}>No Internet Connection</Text>

						<Text style={styles.message}>{statusMessage}</Text>

						<Text style={styles.description}>
							Kaiju requires an active internet connection to function properly. Please check your connection and try again.
						</Text>

						{showRetryButton && (
							<View style={styles.buttonContainer}>
								<TouchableOpacity
									onPress={handleRetry}
									style={styles.retryButton}
								>
									<Text style={styles.buttonText}>Try Again</Text>
								</TouchableOpacity>
							</View>
						)}

						{allowDismiss && (
							<View style={styles.buttonContainer}>
								<TouchableOpacity
									onPress={() => {
										// This would close the modal, but typically we don't want to allow dismissing network errors
									}}
									style={styles.dismissButton}
								>
									<Text style={styles.dismissButtonText}>Continue Offline</Text>
								</TouchableOpacity>
							</View>
						)}

						{/* Debug info and controls in development */}
						{__DEV__ && (
							<View style={styles.debugContainer}>
								<Text style={styles.debugText}>Network debugging is enabled in development mode.</Text>
								{isTestMode && (
									<View style={styles.buttonContainer}>
										<TouchableOpacity
											onPress={() => {
												logger.breadcrumb({ category: 'network', message: 'Dev: Simulating online network state' });
												simulateOnline();
											}}
											style={styles.devButton}
										>
											<Text style={styles.devButtonText}>🛠️ Simulate Online (Dev)</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>
						)}
					</View>
				</View>
			</View>
		</Modal>
	);
};

export default NetworkError;
