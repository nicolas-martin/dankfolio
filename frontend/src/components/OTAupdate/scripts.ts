import { useState, useCallback } from 'react';
import * as Updates from 'expo-updates';
import { Alert } from 'react-native';

function isNonDefaultRuntimeVersion(version: any) {
  return version && version !== '1' && version !== 1;
}

function isNonEmptyManifest(manifest: any) {
  return manifest && typeof manifest === 'object' && Object.keys(manifest).length > 0;
}

export function useOTAUpdate() {
  const [checking, setChecking] = useState(false);

  const checkForUpdate = useCallback(async () => {
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
        await Updates.fetchUpdateAsync();
        Alert.alert(
          'Update Available',
          `${buildInfo ? buildInfo + '\n\n' : ''}Downloading and applying the update...`
        );
        Updates.reloadAsync();
      } else {
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
      console.error('[OTA] Error checking for update:', e);
    } finally {
      setChecking(false);
    }
  }, []);

  return { checking, checkForUpdate };
}