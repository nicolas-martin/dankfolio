import React from 'react';
import { TouchableOpacity } from 'react-native';
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
		<TouchableOpacity
			onPress={handlePress}
			disabled={disabled || copyState.isAnimating}
			testID={testID}
			activeOpacity={0.7}
			style={styles.defaultIconButton}
		>
			{copyState.isAnimating ? (
				<CheckIcon
					size={iconSize}
					color={styles.colors.primary}
				/>
			) : (
				<CopyIcon
					size={iconSize}
					color={iconColor || styles.colors.onSurface}
				/>
			)}
		</TouchableOpacity>
	);
};

export default CopyToClipboard; 
