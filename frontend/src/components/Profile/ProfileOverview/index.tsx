import React from 'react';
import { View } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SendIcon } from '@components/Common/Icons';
import { useStyles } from './profileoverview_styles';
import { ProfileOverviewProps } from './profileoverview_types';
import { formatPrice } from 'utils/numberFormat';

const ProfileOverview: React.FC<ProfileOverviewProps> = ({
	totalValue,
	tokensCount,
	onSendPress,
	disabled = false
}) => {
	const styles = useStyles();
	const buttonIcon = React.useCallback(() => (
		<SendIcon size={20} color={styles.colors.onPrimary} />
	), [styles.colors.onPrimary]);

	return (
		<View style={styles.tabContainer}>
			<View style={styles.tabContentContainer}>
				<View style={styles.portfolioSection}>
					<Text style={styles.portfolioTitle} accessible={true}>Total Portfolio Value</Text>
					<Text style={styles.portfolioValue} accessible={true}>
						{formatPrice(totalValue, true)}
					</Text>
					<Text style={styles.portfolioSubtext} accessible={true}>
						{tokensCount} Token{tokensCount !== 1 ? 's' : ''}
					</Text>
					<Button
						mode="contained"
						icon={buttonIcon}
						onPress={onSendPress}
						{...styles.sendButtonStyle}
						contentStyle={styles.sendButtonContent}
						disabled={disabled}
						accessible={true}
						testID="send-tokens-button"
					>
						<Text style={styles.sendButtonText}>Send Tokens</Text>
					</Button>
				</View>
			</View>
		</View>
	);
};

export default ProfileOverview;