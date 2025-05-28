import { useState, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';
import { logger } from '@/utils/logger';

function isNonDefaultRuntimeVersion(version: any) {
	return version && version !== '1' && version !== 1;
}

function isNonEmptyManifest(manifest: any) {
	return manifest && typeof manifest === 'object' && Object.keys(manifest).length > 0;
}

export function useOTAUpdate() {
	const [checking, setChecking] = useState(false);

	const checkForUpdate = useCallback(async () => {
		logger.breadcrumb({ category: 'ota', message: 'OTA: Checking for update' });
		setChecking(true);
		const infoLines: string[] = [];
		if (Updates.channel) infoLines.push(`Channel: ${Updates.channel}`);
		if (Updates.createdAt) infoLines.push(`Created At: ${new Date(Updates.createdAt).toLocaleString()}`);
		if (isNonDefaultRuntimeVersion(Updates.runtimeVersion)) infoLines.push(`Runtime Version: ${Updates.runtimeVersion}`);
		if (isNonEmptyManifest(Updates.manifest)) infoLines.push(`Manifest: ${JSON.stringify(Updates.manifest, null, 2)}`);
		const buildInfo = infoLines.length > 0 ? infoLines.join('\n') : '';
		try {
			const update = await Updates.checkForUpdateAsync();
			if (update.isAvailable) {
				logger.breadcrumb({ category: 'ota', message: 'OTA: Update available', data: { manifest: update.manifest?.id } });
				await Updates.fetchUpdateAsync();
				logger.breadcrumb({ category: 'ota', message: 'OTA: Update fetched' });
				Alert.alert(
					'Update Available',
					`${buildInfo ? buildInfo + '\n\n' : ''}Downloading and applying the update...`
				);
				logger.breadcrumb({ category: 'ota', message: 'OTA: Reloading app for update' });
				Updates.reloadAsync();
			} else {
				logger.breadcrumb({ category: 'ota', message: 'OTA: No update available' });
				Alert.alert(
					'Up to Date',
					`${buildInfo ? buildInfo + '\n\n' : ''}You already have the latest version.`
				);
			}
		} catch (e) {
			Alert.alert(
				'Error',
				`${buildInfo ? buildInfo + '\n\n' : ''}Failed to check for updates:\n${(e as Error).message}`
			);
			logger.exception(e, { functionName: 'checkForUpdate', context: 'OTA Update' });
		} finally {
			setChecking(false);
		}
	}, []);

	return { checking, checkForUpdate };
}
