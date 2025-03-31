import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SwapButtonProps } from './swapbutton_types';
import { styles } from './swapbutton_styles';
import { ICON_SIZE, ICON_COLOR, ICON_NAME } from './swapbutton_scripts';

const SwapButton: React.FC<SwapButtonProps> = ({ onPress, disabled }) => {
	return (
		<TouchableOpacity
			style={[styles.swapButton, disabled && styles.disabled]}
			onPress={onPress}
			disabled={disabled}
		>
			<Ionicons name={ICON_NAME} size={ICON_SIZE} color={ICON_COLOR} />
		</TouchableOpacity>
	);
};

export default SwapButton;
