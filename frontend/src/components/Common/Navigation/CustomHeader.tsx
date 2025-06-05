import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme, Appbar, IconButton } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { ThemeType } from '@utils/theme';

interface CustomHeaderProps {
	themeType: ThemeType;
	toggleTheme: () => Promise<void>;
}

const CustomHeader: React.FC<CustomHeaderProps> = ({ themeType, toggleTheme }) => {
	const route = useRoute();
	const navigation = useNavigation();
	const theme = useTheme();
	// Don't show back button on home screen
	const showBackButton = route.name !== 'Home';

	return (
		<Appbar.Header style={{ backgroundColor: theme.colors.background }}>
			{showBackButton && <Appbar.BackAction testID="back-button" onPress={() => navigation.goBack()} />}
			<Appbar.Content title={route.name} />
			<IconButton
				icon={themeType === 'light' ? 'weather-night' : 'white-balance-sunny'}
				iconColor={theme.colors.onBackground}
				size={24}
				onPress={toggleTheme}
				testID="theme-toggle-button"
			/>
		</Appbar.Header>
	);
};

const styles = StyleSheet.create({
	container: {
	},
});

export default CustomHeader;
