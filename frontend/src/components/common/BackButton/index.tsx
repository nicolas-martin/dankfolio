import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BackButtonProps } from './backbutton_types';
import { styles } from './backbutton_styles';
import { ICON_NAME, ICON_SIZE, ICON_COLOR, handleNavigation } from './backbutton_scripts';

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
