import React from 'react';
import { TouchableOpacity, View, Image, ActivityIndicator } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { CoinsIcon } from '@components/Common/Icons';
import { createStyles } from './profile_styles';
import { copyToClipboard, formatAddress } from './profile_scripts';
import { useToast } from '@components/Common/Toast';
import { ProfileCoin } from './profile_types';
import { useProxiedImage } from '@/hooks/useProxiedImage';

interface TokenCardProps {
	profileCoin: ProfileCoin;
	onPress: () => void;
}

export const TokenCard: React.FC<TokenCardProps> = ({ profileCoin, onPress }) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { showToast } = useToast();

	const { imageUri, isLoading } = useProxiedImage(profileCoin.coin.iconUrl);

	return (
		<TouchableOpacity onPress={onPress}>
			<View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant }]}>
				<View style={styles.tokenCardRow}>
					<View style={[styles.tokenIconContainer, { backgroundColor: theme.colors.background }]}>
						{isLoading ? (
							<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
								<ActivityIndicator size="small" color={theme.colors.onSurfaceVariant} />
							</View>
						) : imageUri ? (
							<Image
								testID={`${profileCoin.coin.symbol}-icon`}
								source={{ uri: imageUri }}
								alt={`${profileCoin.coin.symbol} icon`}
								style={styles.tokenImage}
								resizeMode="contain"
							/>
						) : (
							<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
								<CoinsIcon size={24} color={theme.colors.onSurfaceVariant} />
							</View>
						)}
					</View>

					<View style={styles.tokenInfoMiddle}>
						<Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
							{profileCoin.coin.symbol}
						</Text>
						<View style={{ flexDirection: 'row', alignItems: 'center' }}>
							<Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
								{formatAddress(profileCoin.coin.mintAddress)}
							</Text>
							<IconButton
								icon="content-copy"
								size={16}
								onPress={() => copyToClipboard(profileCoin.coin.mintAddress, profileCoin.coin.symbol, showToast)}
								style={{ margin: 0, padding: 0, marginLeft: 4 }}
							/>
						</View>
					</View>

					<View style={styles.tokenBalance}>
						<Text variant="bodyLarge" style={styles.tokenBalanceText}>
							{profileCoin.amount.toFixed(6)}
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
