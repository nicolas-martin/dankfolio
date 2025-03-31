import React from 'react';
import { View } from 'react-native';
import BackButton from '../BackButton';
import { TopBarProps } from './topbar_types';
import { styles } from './topbar_styles';
import { getContainerStyle } from './topbar_scripts';

const TopBar: React.FC<TopBarProps> = () => {
	return (
		<View style={[styles.container, getContainerStyle()]}>
			<BackButton style={styles.backButton} />
		</View>
	);
};

export default TopBar;
