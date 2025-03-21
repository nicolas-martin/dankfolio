import React from 'react';
import { View } from 'react-native';
import BackButton from '../BackButton';
import { TopBarProps } from './types';
import { styles } from './styles';
import { getContainerStyle } from './scripts';

const TopBar: React.FC<TopBarProps> = () => {
	return (
		<View style={[styles.container, getContainerStyle()]}>
			<BackButton style={styles.backButton} />
		</View>
	);
};

export default TopBar;
