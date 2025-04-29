import React from 'react';
import { View, Text } from 'react-native';
import { styles } from './styles';
import { SearchScreenProps } from './types';

const SearchScreen: React.FC<SearchScreenProps> = () => {
	return (
		<View style={styles.container}>
			<Text>Search Screen</Text>
		</View>
	);
};

export default SearchScreen; 