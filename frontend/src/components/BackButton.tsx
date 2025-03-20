import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface BackButtonProps {
	style?: object;
}

const BackButton: React.FC<BackButtonProps> = ({ style }) => {
	const navigation = useNavigation();

	return (
		<TouchableOpacity
			style={[styles.backButton, style]}
			onPress={() => navigation.goBack()}
		>
			<Ionicons name="arrow-back" size={24} color="#fff" />
		</TouchableOpacity>
	);
};

const styles = StyleSheet.create({
	backButton: {
		padding: 10,
		borderRadius: 20,
		backgroundColor: 'rgba(255, 255, 255, 0.1)',
	},
});

export default BackButton;
