import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BackButtonProps } from './types';
import { styles } from './styles';
import { ICON_NAME, ICON_SIZE, ICON_COLOR, handleNavigation } from './scripts';

const BackButton: React.FC<BackButtonProps> = ({ style }) => {
	const navigation = useNavigation();

	return (
		<TouchableOpacity
			style={[styles.backButton, style]}
			onPress={handleNavigation(navigation.goBack)}
		>
			<Ionicons name={ICON_NAME} size={ICON_SIZE} color={ICON_COLOR} />
		</TouchableOpacity>
	);
};

export default BackButton;
