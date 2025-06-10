import React from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { Text, useTheme, List, Switch, Divider, IconButton } from 'react-native-paper';
import Constants from 'expo-constants';
import { useThemeStore } from '@/store/theme';
import { usePortfolioStore } from '@/store/portfolio';
import { createStyles } from './settings_styles';
import { logger } from '@/utils/logger';
import { useToast } from '@components/Common/Toast';
import { copyToClipboard as copyUtil } from '@/screens/Profile/profile_scripts';

const Settings: React.FC = () => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { showToast } = useToast();

	const { themeType, toggleTheme, isLoading: isThemeLoading } = useThemeStore();
	const isDarkTheme = themeType === 'neon';

	const { wallet } = usePortfolioStore();

	const appVersion = Constants.expoConfig?.version || 'N/A';
	// In a real app, this would come from a secure source and be handled with extreme care.
	const privateKeyPlaceholder = '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••';


	const handleCopyToClipboard = (text: string, label: string) => {
		copyUtil(text, label, showToast);
		logger.info(`Copied ${label} to clipboard`);
	};

	return (
		<SafeAreaView style={styles.safeArea}>
			<ScrollView contentContainerStyle={styles.scrollContent}>
				<View style={styles.container}>
					<Text style={styles.headerTitle}>Settings</Text>

					<List.Section title="Account Information" titleStyle={styles.sectionTitle}>
						<List.Item
							title="Public Key"
							description={wallet?.address ? wallet.address : 'N/A'}
							titleStyle={styles.listItemTitle}
							descriptionStyle={styles.listItemDescription}
							left={props => <List.Icon {...props} icon="wallet-outline" />}
							right={props =>
								wallet?.address ? (
									<IconButton
										{...props}
										icon="content-copy"
										size={20}
										onPress={() => handleCopyToClipboard(wallet.address, 'Public Key')}
										testID="copy-public-key-button" // Added testID
									/>
								) : null
							}
						/>
						<Divider style={styles.divider} />
						<List.Item
							title="Private Key"
							description={privateKeyPlaceholder} // Placeholder
							titleStyle={styles.listItemTitle}
							descriptionStyle={styles.listItemDescription}
							left={props => <List.Icon {...props} icon="key-variant" />}
						/>
						<Text style={styles.warningText}>
							Warning: Your private key is highly sensitive. Never share it with anyone.
						</Text>
					</List.Section>

					<List.Section title="App Information" titleStyle={styles.sectionTitle}>
						<List.Item
							title="App Version"
							description={appVersion}
							titleStyle={styles.listItemTitle}
							descriptionStyle={styles.listItemDescription}
							left={props => <List.Icon {...props} icon="information-outline" />}
						/>
					</List.Section>

					<List.Section title="Appearance" titleStyle={styles.sectionTitle}>
						<List.Item
							title="Theme"
							description={isDarkTheme ? 'Neon Glow' : 'Daylight Mode'}
							titleStyle={styles.listItemTitle}
							descriptionStyle={styles.listItemDescription}
							left={props => <List.Icon {...props} icon={isDarkTheme ? "weather-night" : "white-balance-sunny"} />}
							right={() => (
								<Switch
									value={isDarkTheme}
									onValueChange={toggleTheme}
									disabled={isThemeLoading}
									color={theme.colors.primary}
								/>
							)}
						/>
					</List.Section>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
};

export default Settings;
