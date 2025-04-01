import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Text, Icon as PaperIcon, useTheme } from 'react-native-paper';
import { ICON_LINK } from '../../../utils/icons';
import { createStyles } from './coininfo_styles';

interface LinkItemProps {
	icon: React.ComponentType<any>;
	label: string;
	value: string;
	onPress: (url: string) => void;
}

export const LinkItem: React.FC<LinkItemProps> = ({
	icon: IconComponent,
	label,
	value,
	onPress,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	return (
		<TouchableOpacity onPress={() => onPress(value)}>
			<View style={styles.linkItemContainer}>
				<View style={[
					styles.linkItemIconContainer,
					{ backgroundColor: theme.colors.surfaceVariant }
				]}>
					<IconComponent size={20} color={theme.colors.onSurface} />
				</View>
				<View style={styles.linkItemTextContainer}>
					<Text
						variant="titleMedium"
						style={[styles.linkItemLabel, { color: theme.colors.onSurface }]}
					>
						{label}
					</Text>
					<Text
						variant="bodyMedium"
						style={[styles.linkItemValue, { color: theme.colors.onSurfaceVariant }]}
						numberOfLines={1}
					>
						{value}
					</Text>
				</View>
				<PaperIcon source={ICON_LINK} size={16} color={theme.colors.onSurfaceVariant} />
			</View>
		</TouchableOpacity>
	);
};
