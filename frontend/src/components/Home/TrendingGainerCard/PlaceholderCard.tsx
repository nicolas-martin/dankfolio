import React from 'react';
import { View } from 'react-native';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import { useStyles } from './styles';

const TrendingGainerPlaceholderCard: React.FC = () => {
	const styles = useStyles();

	return (
		<View style={styles.card}>
			<ShimmerPlaceholder 
				style={{
					width: 48,
					height: 48,
					borderRadius: 24,
					marginBottom: 10,
					alignSelf: 'center',
				}}
			/>
			<ShimmerPlaceholder 
				style={{
					width: '80%',
					height: 16,
					marginBottom: styles.theme.spacing.xs,
					borderRadius: styles.theme.borderRadius.sm,
					alignSelf: 'center',
				}}
			/>
			<ShimmerPlaceholder 
				style={{
					width: '60%',
					height: 14,
					borderRadius: styles.theme.borderRadius.sm,
					alignSelf: 'center',
				}}
			/>
		</View>
	);
};

export default TrendingGainerPlaceholderCard; 