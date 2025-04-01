import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme, Appbar } from 'react-native-paper';
import BackButton from '../components/Common/BackButton';
import { useRoute, useNavigation } from '@react-navigation/native';

const CustomHeader: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const theme = useTheme();
  // Don't show back button on home screen
  const showBackButton = route.name !== 'Home';

  return (
    <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
      {showBackButton && <Appbar.BackAction onPress={() => navigation.goBack()} />}
    </Appbar.Header>
  );
};

const styles = StyleSheet.create({
  container: {
  },
});

export default CustomHeader;