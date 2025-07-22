import React, { useMemo } from 'react';
import { View, ScrollView, SafeAreaView } from 'react-native';
import { Text, List, Switch, Divider, IconButton, ActivityIndicator } from 'react-native-paper';
import Constants from 'expo-constants';
// import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '@/store/theme';
import { usePortfolioStore } from '@/store/portfolio';
import { useStyles } from './settings_styles';
import CopyToClipboard from '@/components/Common/CopyToClipboard';
import { usePrivateKeyVisibility } from './settings_scripts';

const Settings: React.FC = () => {
	const styles = useStyles();
	// const navigation = useNavigation<SettingsNavigationProp>();

	const { themeType, toggleTheme, isLoading: isThemeLoading } = useThemeStore();
	const isDarkTheme = themeType === 'neon';

	const { wallet } = usePortfolioStore();
	const { privateKeyState, togglePrivateKeyVisibility, getPrivateKeyDisplay, getEyeIconName } = usePrivateKeyVisibility();

	const appVersion = Constants.expoConfig?.version || 'N/A';

	const privateKeyDescriptionStyle = useMemo(() => [
		styles.listItemDescription,
		privateKeyState.isVisible && styles.privateKeyVisible,
		privateKeyState.error && styles.privateKeyError
	], [styles.listItemDescription, styles.privateKeyVisible, styles.privateKeyError, privateKeyState.isVisible, privateKeyState.error]);

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
							right={() =>
								wallet?.address ? (
									<CopyToClipboard
										text={wallet.address}
										testID="copy-public-key-button"
									/>
								) : null
							}
						/>
						<Divider style={styles.divider} />
						<View style={styles.privateKeyContainer}>
							<List.Item
								title="Private Key"
								description={getPrivateKeyDisplay()}
								titleStyle={styles.listItemTitle}
								descriptionStyle={privateKeyDescriptionStyle}
								descriptionNumberOfLines={0}
								left={props => <List.Icon {...props} icon="key-variant" />}
								right={() => (
									<View style={styles.privateKeyActions}>
										{privateKeyState.isVisible && privateKeyState.privateKey && (
											<CopyToClipboard
												text={privateKeyState.privateKey}
												testID="copy-private-key-button"
											/>
										)}
										{privateKeyState.isLoading ? (
											<ActivityIndicator size="small" color={styles.colors.primary} />
										) : (
											<IconButton
												icon={getEyeIconName()}
												onPress={togglePrivateKeyVisibility}
												testID="toggle-private-key-visibility"
												size={20}
											/>
										)}
									</View>
								)}
							/>
						</View>
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
									color={styles.colors.primary}
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
