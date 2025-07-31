import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useStyles } from './screenheader_styles';
import { ScreenHeaderProps } from './screenheader_types';

const ScreenHeader: React.FC<ScreenHeaderProps> = ({
	title,
	rightAction,
	showRightAction = false,
	subtitle,
}) => {
	const styles = useStyles();

	return (
		<View style={styles.fixedHeader}>
			<View style={styles.headerContent}>
				<View style={styles.titleContainer}>
					<Text style={styles.headerTitle}>{title}</Text>
					{subtitle && (
						<Text style={styles.headerSubtitle}>{subtitle}</Text>
					)}
				</View>
				{showRightAction && rightAction && (
					<Pressable
						onPress={rightAction.onPress}
						style={styles.rightActionButton}
						accessible={true}
						testID={rightAction.testID}
					>
						{rightAction.icon}
					</Pressable>
				)}
			</View>
		</View>
	);
};

export default ScreenHeader;