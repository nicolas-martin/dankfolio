import React from 'react';
import { useTheme, Appbar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';

const CustomHeader: React.FC = () => {
	const navigation = useNavigation();
	const route = useRoute();
	const theme = useTheme();
	// Don't show back button on home screen
	const showBackButton = route.name !== 'Home';

	return (
		<Appbar.Header style={{ backgroundColor: theme.colors.background }}>
			{showBackButton && <Appbar.BackAction testID="back-button" onPress={() => navigation.goBack()} />}
			<Appbar.Content title={route.name} />
		</Appbar.Header>
	);
};

export default CustomHeader;
