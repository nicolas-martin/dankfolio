import React from 'react';
import { View } from 'react-native';
import ShimmerPlaceholder from '@/components/Common/ShimmerPlaceholder';
import { useStyles } from './styles';

const NewListingPlaceholderCard: React.FC = () => {
	const styles = useStyles();

	return (
		<View style={styles.card}>
			{/* Icon shimmer */}
			<View style={styles.iconContainer}>
				<ShimmerPlaceholder 
					style={styles.shimmerIcon}
				/>
			</View>
			
			{/* Symbol shimmer */}
			<ShimmerPlaceholder 
				style={styles.shimmerSymbol}
			/>
		</View>
	);
};

export default NewListingPlaceholderCard; 