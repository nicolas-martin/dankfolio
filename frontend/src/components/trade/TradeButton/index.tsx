import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { TradeButtonProps } from './types';
import { styles } from './styles';
import { SPINNER_SIZE, SPINNER_COLOR, getButtonState } from './scripts';

const TradeButton: React.FC<TradeButtonProps> = ({
	onPress,
	isSubmitting,
	disabled,
	label,
}) => {
	const { isDisabled, showSpinner } = getButtonState(isSubmitting, disabled);

	return (
		<TouchableOpacity
			style={[styles.button, isDisabled && styles.disabled]}
			onPress={onPress}
			disabled={isDisabled}
		>
			{showSpinner ? (
				<ActivityIndicator size={SPINNER_SIZE} color={SPINNER_COLOR} />
			) : (
				<Text style={styles.text}>{label}</Text>
			)}
		</TouchableOpacity>
	);
};

export default TradeButton;
