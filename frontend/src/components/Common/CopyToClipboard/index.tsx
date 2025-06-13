import React from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { Icon } from 'react-native-paper';
import { CopyToClipboardProps } from './types';
import { useCopyToClipboard } from './scripts';
import { useStyles } from './styles';

const CopyToClipboard: React.FC<CopyToClipboardProps> = ({
	text,
	children,
	onCopy,
	disabled = false,
	testID,
}) => {
	const styles = useStyles();
	const { copyState, copyToClipboard } = useCopyToClipboard();

	const handlePress = () => {
		if (disabled || copyState.isAnimating) return;
		copyToClipboard(text, onCopy);
	};

	return (
		<View style={[styles.container, disabled && styles.disabledContainer]}>
			<TouchableOpacity
				onPress={handlePress}
				disabled={disabled || copyState.isAnimating}
				testID={testID}
				activeOpacity={0.7}
			>
				{children}
			</TouchableOpacity>
			
			{copyState.isAnimating && (
				<Animated.View style={styles.checkmarkContainer}>
					<View style={styles.checkmarkIcon}>
						<Icon 
							source="check" 
							size={24} 
							color="white"
						/>
					</View>
				</Animated.View>
			)}
		</View>
	);
};

export default CopyToClipboard; 