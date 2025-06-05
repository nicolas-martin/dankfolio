import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Card, Text, Chip } from 'react-native-paper';
import appCheck from '@react-native-firebase/app-check';
import { logger as log } from '@/utils/logger';
import { grpcApi } from '@/services/grpcApi';
import { env } from '@utils/env';

const isDevelopmentOrSimulator = __DEV__ || env.appEnv === 'local' || env.appEnv === 'production-simulator';
export const AuthTest: React.FC = () => {
	const [appCheckToken, setAppCheckToken] = useState<string | null>(null);
	const [testResult, setTestResult] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const checkAppCheckStatus = async () => {
		try {
			if (isDevelopmentOrSimulator) {
				const appCheckToken = { token: "0FD7F5EB-8676-4D7E-A930-25A1D1B71045" }
				setAppCheckToken(appCheckToken.token || null);
			} else {
				const tokenResult = await appCheck().getToken(false);
				const hasToken = !!tokenResult?.token;

				setAppCheckToken(tokenResult?.token || null);
				log.info('🔐 App Check status checked', { hasToken });
			}
		} catch (error) {
			log.error('❌ Failed to check App Check status:', error);
			setAppCheckToken(null);
		}
	};

	const refreshAppCheckToken = async () => {
		setLoading(true);
		try {
			if (isDevelopmentOrSimulator) {
				const tokenResult = { token: "0FD7F5EB-8676-4D7E-A930-25A1D1B71045" }
				setAppCheckToken(tokenResult?.token || null);
			} else {
				const tokenResult = await appCheck().getToken(true); // Force refresh
				setAppCheckToken(tokenResult?.token || null);
				log.info('🔐 App Check token refreshed successfully');
			}
		} catch (error) {
			log.error('❌ Failed to refresh App Check token:', error);
		} finally {
			setLoading(false);
		}
	};

	const testApiCall = async () => {
		setLoading(true);
		setTestResult(null);
		try {
			// Make a simple API call to test authentication
			const coins = await grpcApi.getAvailableCoins(true);
			setTestResult(`✅ API call successful! Retrieved ${coins.length} coins.`);
			log.info('🔐 Test API call successful', { coinCount: coins.length });
		} catch (error) {
			setTestResult(`❌ API call failed: ${error.message}`);
			log.error('❌ Test API call failed:', error);
		} finally {
			setLoading(false);
		}
	};

	React.useEffect(() => {
		checkAppCheckStatus();
	}, []);

	return (
		<Card style={styles.card}>
			<Card.Content>
				<Text variant="titleMedium" style={styles.title}>
					🔐 Firebase App Check Test
				</Text>

				<View style={styles.statusContainer}>
					<Text variant="bodyMedium">Status:</Text>
					<Chip
						icon={appCheckToken ? "check" : "close"}
						style={[styles.chip, { backgroundColor: appCheckToken ? '#4CAF50' : '#f44336' }]}
					>
						{appCheckToken ? 'Valid App Check Token' : 'No App Check Token'}
					</Chip>
				</View>

				{appCheckToken && (
					<View style={styles.tokenContainer}>
						<Text variant="bodySmall" style={styles.tokenLabel}>App Check Token (first 50 chars):</Text>
						<Text variant="bodySmall" style={styles.tokenText}>
							{appCheckToken.substring(0, 50)}...
						</Text>
					</View>
				)}

				{testResult && (
					<View style={styles.resultContainer}>
						<Text variant="bodyMedium" style={styles.resultText}>
							{testResult}
						</Text>
					</View>
				)}

				<View style={styles.buttonContainer}>
					<Button
						mode="outlined"
						onPress={checkAppCheckStatus}
						style={styles.button}
						disabled={loading}
					>
						Check Status
					</Button>

					<Button
						mode="contained"
						onPress={refreshAppCheckToken}
						style={styles.button}
						loading={loading}
						disabled={loading}
					>
						Refresh Token
					</Button>
				</View>

				<View style={styles.buttonContainer}>
					<Button
						mode="contained"
						onPress={testApiCall}
						style={styles.button}
						loading={loading}
						disabled={loading || !appCheckToken}
					>
						Test API Call
					</Button>
				</View>
			</Card.Content>
		</Card>
	);
};

const styles = StyleSheet.create({
	card: {
		margin: 16,
	},
	title: {
		marginBottom: 16,
		textAlign: 'center',
	},
	statusContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	chip: {
		marginLeft: 8,
	},
	tokenContainer: {
		marginBottom: 12,
	},
	tokenLabel: {
		fontWeight: 'bold',
		marginBottom: 4,
	},
	tokenText: {
		fontFamily: 'monospace',
		backgroundColor: '#f5f5f5',
		padding: 8,
		borderRadius: 4,
	},
	resultContainer: {
		marginBottom: 12,
		padding: 12,
		backgroundColor: '#f8f9fa',
		borderRadius: 8,
	},
	resultText: {
		fontWeight: 'bold',
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-around',
		marginBottom: 8,
	},
	button: {
		flex: 1,
		marginHorizontal: 4,
	},
}); 
