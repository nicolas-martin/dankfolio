import React from 'react';
import { TouchableOpacity, View, Image } from 'react-native';
import { Text, Icon, useTheme, IconButton } from 'react-native-paper';
import { ICON_COINS } from '../../utils/icons';
import { createStyles } from './profile_styles';
import { copyToClipboard, formatAddress } from './profile_scripts';
import { useToast } from '@components/Common/Toast';
import { ProfileCoin } from './profile_types';
interface TokenCardProps {
	profileCoin: ProfileCoin;
	onPress: () => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({ profileCoin, onPress }) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { showToast } = useToast();

	const iconUrl = profileCoin.coin.icon_url;
	return (
		<TouchableOpacity onPress={onPress}>
			<View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
				<View style={styles.tokenCardRow}>
					{iconUrl ? ( // Use the iconUrl derived from the store
						<View style={[styles.tokenIconContainer, { backgroundColor: theme.colors.background }]}>
							<Image
								testID={`${profileCoin.coin.symbol}-icon`}
								source={{ uri: iconUrl }}
								alt={`${profileCoin.coin.symbol} icon`}
								style={styles.tokenImage}
								resizeMode="contain"
							/>
						</View>
					) : (
						<View style={[styles.tokenIconContainer, styles.centered, { backgroundColor: theme.colors.background }]}>
							<Icon source={ICON_COINS} size={24} color={theme.colors.onSurfaceVariant} />
						</View>
					)}

					<View style={styles.tokenInfoMiddle}>
						<Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
							{profileCoin.coin.symbol}
						</Text>
						<View style={{ flexDirection: 'row', alignItems: 'center' }}>
							<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
								{formatAddress(profileCoin.coin.id)}
							</Text>
							<IconButton
								icon="content-copy"
								size={16}
								onPress={() => copyToClipboard(profileCoin.coin.id, profileCoin.coin.symbol, showToast)}
								style={{ margin: 0, padding: 0, marginLeft: 4 }}
							/>
						</View>
					</View>

					<View style={styles.tokenBalance}>
						<Text variant="bodyLarge" style={styles.tokenBalanceText}>
							{profileCoin.amount.toFixed(4)}
						</Text>
						<Text variant="bodySmall" style={styles.tokenValueText}>
							${(profileCoin.amount * (profileCoin.coin.price || 0)).toFixed(4)}
						</Text>
					</View>
				</View>
			</View>
		</TouchableOpacity>
	);
};
