import React, { useMemo } from 'react'; // Add useMemo
import { useTheme, Appbar } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';

const CustomHeader: React.FC = () => {
	const navigation = useNavigation();
	const route = useRoute();
	const theme = useTheme();
	// Don't show back button on home screen
	const showBackButton = route.name !== 'Home';

	const headerStyle = useMemo(() => ({
		backgroundColor: theme.colors.background
	}), [theme.colors.background]);

	return (
		<Appbar.Header style={headerStyle}>
			{showBackButton && <Appbar.BackAction testID="back-button" onPress={() => navigation.goBack()} />}
			<Appbar.Content title={route.name} />
		</Appbar.Header>
	);
};

export default CustomHeader;
