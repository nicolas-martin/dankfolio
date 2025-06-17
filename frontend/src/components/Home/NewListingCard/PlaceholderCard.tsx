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
					style={{
						width: 20,
						height: 20,
						borderRadius: 10,
					}}
				/>
			</View>
			
			{/* Symbol shimmer */}
			<ShimmerPlaceholder 
				style={{
					flex: 1,
					height: 12,
					borderRadius: styles.theme.borderRadius.sm,
				}}
			/>
		</View>
	);
};

export default NewListingPlaceholderCard; 