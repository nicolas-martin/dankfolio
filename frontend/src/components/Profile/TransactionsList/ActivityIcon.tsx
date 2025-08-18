import React from 'react';
import { View } from 'react-native';
import { IconButton } from 'react-native-paper';
import CachedImage from '@/components/Common/CachedImage';
import { ActivityIconProps } from './activity_types';
import { useStyles } from './activity_styles';

const ActivityIcon: React.FC<ActivityIconProps> = ({
	baseTokenIcon,
	actionBadgeIcon,
	actionBadgeType,
	size = 48
}) => {
	const styles = useStyles();

	const getBadgeIcon = () => {
		switch (actionBadgeType) {
			case 'arrow-down':
				return 'arrow-down';
			case 'paper-plane':
				return 'send';
			case 'token-icon':
				return null; // Will render token icon instead
			default:
				return 'help-circle';
		}
	};

	const badgeSize = Math.round(size * 0.375); // 18px for 48px base

	return (
		<View style={styles.iconContainer}>
			{/* Base token icon */}
			<View style={[styles.baseIcon, { width: size, height: size }]}>
				{baseTokenIcon ? (
					<CachedImage
						uri={baseTokenIcon}
						style={[styles.tokenImage, { width: size, height: size }]}
					/>
				) : (
					<View style={[styles.fallbackIcon, { width: size, height: size }]}>
						<IconButton
							icon="help-circle"
							size={size * 0.5}
							iconColor={styles.colors.onSurfaceVariant}
						/>
					</View>
				)}
			</View>

			{/* Action badge */}
			<View style={[styles.badge, { width: badgeSize * 1.5, height: badgeSize * 1.5 }]}>
				{actionBadgeType === 'token-icon' && actionBadgeIcon ? (
					<CachedImage
						uri={actionBadgeIcon}
						size={badgeSize * 1.3}
						// iconColor={styles.colors.onSurface}
						style={styles.badgeTokenImage}
					/>
				) : (
					<IconButton
						icon={getBadgeIcon() || 'help-circle'}
						iconColor={styles.colors.onSurface}
						size={badgeSize * 1.3}
						style={styles.badgeIconButton}
					/>
				)}
			</View>
		</View>
	);
};

export default ActivityIcon;
