import React from 'react';
import { Box } from '@gluestack-ui/themed';
import BackButton from '../components/Common/BackButton';
import { useRoute } from '@react-navigation/native';

const CustomHeader: React.FC = () => {
  const route = useRoute();
  // Don't show back button on home screen
  const showBackButton = route.name !== 'Home';

  return (
    <Box
      height={48}
      flexDirection="row"
      alignItems="center"
      px="$4"
      bg="$background"
      borderBottomWidth={1}
      borderBottomColor="$borderLight"
      shadowColor="$backgroundDark"
      shadowOffset={{ width: 0, height: 2 }}
      shadowOpacity={0.1}
      shadowRadius={3}
      elevation={3}
    >
      {showBackButton && <BackButton />}
    </Box>
  );
};

export default CustomHeader;