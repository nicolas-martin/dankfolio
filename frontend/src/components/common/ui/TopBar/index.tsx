import React from 'react';
import { View } from 'react-native';
import BackButton from '../BackButton';
import { TopBarProps } from './types';
import { styles } from './styles';
import { theme } from '../../../../utils/theme';

const TopBar: React.FC<TopBarProps> = () => {
	return (
		<View style={[styles.container, { backgroundColor: theme.colors.topBar }]}>
			<BackButton style={styles.backButton} />
		</View>
	);
};

export default TopBar;
