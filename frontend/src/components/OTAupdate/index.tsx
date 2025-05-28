import { useEffect } from 'react';
import { Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { logger } from '@/utils/logger';
import { useOTAUpdate } from './scripts';
import { styles } from './styles';

export const OTAUpdater = () => {
	const { checking, checkForUpdate } = useOTAUpdate();

	useEffect(() => {
		logger.breadcrumb({ category: 'ota', message: 'OTAUpdater component mounted' });
	}, []);

	const handleCheckForUpdate = () => {
		logger.breadcrumb({ category: 'ota', message: 'OTA: User initiated update check' });
		checkForUpdate();
	};

	return (
		<Pressable onPress={handleCheckForUpdate} disabled={checking} style={styles.link}>
			<Text style={styles.linkText} variant="bodySmall">
				{checking ? 'Checking for updates…' : 'Check for updates'}
			</Text>
		</Pressable>
	);
};
