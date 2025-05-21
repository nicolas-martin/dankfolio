import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { useOTAUpdate } from './scripts';
import { styles } from './styles';

export const OTAUpdater = () => {
	const { checking, checkForUpdate } = useOTAUpdate();

	return (
		<View style={styles.container}>
			<Pressable onPress={checkForUpdate} disabled={checking} style={styles.link}>
				<Text style={styles.linkText} variant="bodySmall">
					{checking ? 'Checking for updates…' : 'Check for updates'}
				</Text>
			</Pressable>
		</View>
	);
};
