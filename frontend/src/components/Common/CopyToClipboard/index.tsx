import React from 'react';
import { View, TouchableOpacity, Animated } from 'react-native';
import { CheckIcon, CopyIcon } from '@/components/Common/Icons';
import { CopyToClipboardProps } from './types';
import { useCopyToClipboard } from './scripts';
import { useStyles } from './styles';

const CopyToClipboard: React.FC<CopyToClipboardProps> = ({
	text,
	onCopy,
	disabled = false,
	testID,
	iconSize = 16,
	iconColor,
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
				style={styles.defaultIconButton}
			>
				<CopyIcon
					size={iconSize}
					color={iconColor || styles.colors.onSurface}
				/>
			</TouchableOpacity>

			{copyState.isAnimating && (
				<Animated.View style={styles.checkmarkContainer}>
					<View style={styles.checkmarkIcon}>
						<CheckIcon
							size={20}
							color="#fff"
						/>
					</View>
				</Animated.View>
			)}
		</View>
	);
};

export default CopyToClipboard; 
