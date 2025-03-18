import React from 'react';
import { View, StyleSheet } from 'react-native';
import BackButton from './BackButton';

const TopBar: React.FC = () => {
    return (
        <View style={styles.container}>
            <BackButton style={styles.backButton} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#191B1F',
    },
    backButton: {
        marginRight: 12,
    },
});

export default TopBar; 