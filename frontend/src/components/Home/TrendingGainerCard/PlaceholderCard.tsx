import React from 'react';
import { View } from 'react-native';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import { useStyles } from './styles';

const TrendingGainerPlaceholderCard: React.FC = () => {
	const styles = useStyles();

	return (
		<View style={styles.card}>
			<ShimmerPlaceholder
				style={styles.shimmerIcon}
			/>
			<ShimmerPlaceholder
				style={styles.shimmerSymbol}
			/>
			<ShimmerPlaceholder
				style={styles.shimmerChange}
			/>
		</View>
	);
};

export default TrendingGainerPlaceholderCard; 
